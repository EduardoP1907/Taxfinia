/**
 * Comparison Report Service
 * Orchestrates the two comparison reports (Forecast vs Anual / Forecast vs
 * Budget vs Anual): build multi-period data → AI narrative (13 sections,
 * same shape as the annual Prometheia report) → DOCX → S3/local → DB record.
 * Mirrors monthly-report.service.ts, but for comparison-report.service.ts's
 * own data source and a single DOCX variant (no Prometheia/Ejecutivo split).
 */

import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import {
  buildComparisonFinancialData, checkEligibility, type ComparisonReportType, type EligibilityResult,
} from './comparison-financial-data.service';
import { generateComparisonAnalysis } from './comparison-ai-analysis.service';
import { generateNarrativeDocx, type DocxReportData } from '../utils/docx-generator';
import { convertDocxToPdf } from '../utils/docx-to-pdf';
import { isS3Enabled, uploadToS3 } from '../utils/s3';

const REPORTS_DIR = path.join(__dirname, '../../uploads/reports');

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

export { checkEligibility };
export type { ComparisonReportType, EligibilityResult };

// A GENERATING record older than this is considered abandoned (e.g. the server
// restarted mid-generation) and may be started again.
const STALE_GENERATION_MS = 10 * 60 * 1000;

// ─── Start: validate + mark GENERATING (returns immediately) ─────────────────
// Generation takes ~1 min (AI), longer than the proxy/CloudFront request timeout,
// so the HTTP request only starts it; the client polls the report list.
export async function startComparisonReport(
  companyId: string,
  userId: string,
  type: ComparisonReportType,
): Promise<{ reportId: string; alreadyRunning: boolean }> {
  const elig = await checkEligibility(companyId, userId, type);
  if (!elig.eligible) throw new Error(elig.reason);
  const { forecastYear, budgetYear } = elig;

  const existing = await prisma.comparisonReport.findUnique({
    where: { companyId_type_forecastYear: { companyId, type, forecastYear } },
  });
  if (existing?.status === 'GENERATING' && Date.now() - existing.updatedAt.getTime() < STALE_GENERATION_MS) {
    return { reportId: existing.id, alreadyRunning: true };
  }

  const report = await prisma.comparisonReport.upsert({
    where: { companyId_type_forecastYear: { companyId, type, forecastYear } },
    update: { status: 'GENERATING', errorMessage: null, budgetYear: budgetYear ?? null },
    create: { companyId, userId, type, forecastYear, budgetYear: budgetYear ?? null, status: 'GENERATING' },
  });
  return { reportId: report.id, alreadyRunning: false };
}

// ─── Main: Generate Comparison Report (synchronous, start → run) ──────────────
export async function generateComparisonReport(
  companyId: string,
  userId: string,
  type: ComparisonReportType,
): Promise<string> {
  const { reportId } = await startComparisonReport(companyId, userId, type);
  await runComparisonReport(reportId);
  return reportId;
}

// ─── Run: build data → AI → DOCX → S3 → COMPLETED / FAILED ────────────────────
export async function runComparisonReport(reportId: string): Promise<void> {
  ensureReportsDir();
  const report = await prisma.comparisonReport.findUniqueOrThrow({ where: { id: reportId } });
  const { companyId, userId, type, forecastYear, budgetYear } = report;
  const startedAt = Date.now();

  try {
    console.log(`[COMPARISON-REPORT] Building financial data for company ${companyId} (${type})...`);
    const { financialData, periodLabels } = await buildComparisonFinancialData(companyId, userId, type);

    console.log('[COMPARISON-REPORT] Generating AI analysis...');
    const aiAnalysis = await generateComparisonAnalysis(financialData, periodLabels, type);

    console.log('[COMPARISON-REPORT] Generating DOCX...');
    const docxFilename = `comparison_report_${report.id}_${forecastYear}.docx`;
    const docxPath = path.join(REPORTS_DIR, docxFilename);

    const docxData: DocxReportData = {
      company: financialData.company,
      latestYear: type === 'FORECAST_BUDGET_VS_ANNUAL' && budgetYear ? budgetYear : forecastYear,
      years: financialData.years,
      periodLabels,
      dcfData: undefined,
      aiAnalysis,
    };
    await generateNarrativeDocx(docxData, docxPath);

    // Pre-render the PDF now (same base name, .pdf) so the first PDF download is
    // instant instead of converting on demand — a cold LibreOffice start could
    // exceed the request timeout. Non-fatal: download falls back to converting.
    const pdfFilename = docxFilename.replace(/\.docx$/i, '.pdf');
    const pdfPath = path.join(REPORTS_DIR, pdfFilename);
    let pdfReady = false;
    try {
      console.log('[COMPARISON-REPORT] Converting DOCX to PDF...');
      await convertDocxToPdf(docxPath, pdfPath);
      pdfReady = fs.existsSync(pdfPath);
    } catch (err) {
      console.warn('[COMPARISON-REPORT] PDF pre-render failed (will convert on download):', err);
    }

    let storedDocxPath = docxFilename;
    if (isS3Enabled()) {
      console.log('[COMPARISON-REPORT] Uploading files to S3...');
      const s3Prefix = `comparison-reports/${report.id}`;
      storedDocxPath = await uploadToS3(
        docxPath, `${s3Prefix}/${docxFilename}`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      if (pdfReady) {
        await uploadToS3(pdfPath, `${s3Prefix}/${pdfFilename}`, 'application/pdf');
      }
    }

    await prisma.comparisonReport.update({
      where: { id: report.id },
      data: {
        status: 'COMPLETED',
        aiAnalysis: aiAnalysis as any,
        docxPath: storedDocxPath,
        generatedAt: new Date(),
      },
    });

    console.log(`[COMPARISON-REPORT] Report ${report.id} generated successfully in ${Math.round((Date.now() - startedAt) / 1000)}s`);
  } catch (error) {
    await prisma.comparisonReport.update({
      where: { id: report.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
      },
    });
    throw error;
  }
}

// ─── Get reports for a company ────────────────────────────────────────────────
export async function getCompanyComparisonReports(companyId: string) {
  // A generation interrupted mid-way (server restart, crash) would otherwise stay
  // GENERATING forever — the UI keeps polling and the button stays disabled.
  // A normal run takes ~1-2 min, so anything past the threshold is abandoned.
  await prisma.comparisonReport.updateMany({
    where: {
      companyId,
      status: 'GENERATING',
      updatedAt: { lt: new Date(Date.now() - STALE_GENERATION_MS) },
    },
    data: {
      status: 'FAILED',
      errorMessage: 'La generación se interrumpió. Vuelve a generar el informe.',
    },
  });

  const rows = await prisma.comparisonReport.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, type: true, forecastYear: true, budgetYear: true, status: true,
      generatedAt: true, docxPath: true, downloadCode: true, errorMessage: true, createdAt: true,
    },
  });
  return rows.map(({ downloadCode, ...r }) => ({ ...r, hasDownloadCode: !!downloadCode }));
}

export async function getComparisonReport(reportId: string) {
  return prisma.comparisonReport.findUnique({
    where: { id: reportId },
    include: { company: { select: { name: true, taxId: true } } },
  });
}

export function getComparisonReportFilePath(filename: string): string {
  return path.join(REPORTS_DIR, filename);
}

export async function setComparisonReportDownloadCode(reportId: string, code: string) {
  return prisma.comparisonReport.update({ where: { id: reportId }, data: { downloadCode: code } });
}

export { convertDocxToPdf };
