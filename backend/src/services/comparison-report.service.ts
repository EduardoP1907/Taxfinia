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

// ─── Main: Generate Comparison Report ─────────────────────────────────────────
export async function generateComparisonReport(
  companyId: string,
  userId: string,
  type: ComparisonReportType,
): Promise<string> {
  ensureReportsDir();

  const elig = await checkEligibility(companyId, userId, type);
  if (!elig.eligible) throw new Error(elig.reason);
  const { forecastYear, budgetYear } = elig;

  const report = await prisma.comparisonReport.upsert({
    where: { companyId_type_forecastYear: { companyId, type, forecastYear } },
    update: { status: 'GENERATING', errorMessage: null, budgetYear: budgetYear ?? null },
    create: { companyId, userId, type, forecastYear, budgetYear: budgetYear ?? null, status: 'GENERATING' },
  });

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

    let storedDocxPath = docxFilename;
    if (isS3Enabled()) {
      console.log('[COMPARISON-REPORT] Uploading files to S3...');
      const s3Prefix = `comparison-reports/${report.id}`;
      storedDocxPath = await uploadToS3(
        docxPath, `${s3Prefix}/${docxFilename}`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
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

    console.log(`[COMPARISON-REPORT] Report ${report.id} generated successfully`);
    return report.id;
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
