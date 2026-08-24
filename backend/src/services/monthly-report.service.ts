/**
 * Monthly Report Service
 * Orchestrates the Forecast Mensual AI reports: two independent Claude calls
 * (Prometheia completo + Ejecutivo conciso), each rendered to its own DOCX,
 * mirroring the annual pipeline in report.service.ts but for monthly data.
 */

import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import { monthlyForecastService } from './monthly-forecast.service';
import {
  generateMonthlyPrometheiaAnalysis, generateMonthlyEjecutivoAnalysis,
  type MonthlyFinancialDataForAI,
} from './monthly-ai-analysis.service';
import { generateMonthlyNarrativeDocx, generateMonthlyExecutiveSummaryDocx, type DocxMonthlyReportData } from '../utils/docx-monthly-generator';
import { convertDocxToPdf } from '../utils/docx-to-pdf';
import { isS3Enabled, uploadToS3 } from '../utils/s3';

const REPORTS_DIR = path.join(__dirname, '../../uploads/reports');

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// ─── Main: Generate Monthly Report (Prometheia + Ejecutivo) ──────────────────
export async function generateMonthlyReport(companyId: string, userId: string, year: number): Promise<string> {
  ensureReportsDir();

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId, deletedAt: null },
  });
  if (!company) throw new Error('Empresa no encontrada');

  // Reuses the existing forecast calculation (verifies ownership again internally)
  const calc = await monthlyForecastService.calculate(companyId, userId, year);

  const report = await prisma.monthlyReport.upsert({
    where: { companyId_year: { companyId, year } },
    update: { status: 'GENERATING', errorMessage: null },
    create: { companyId, userId, year, status: 'GENERATING' },
  });

  try {
    const aiData: MonthlyFinancialDataForAI = {
      company: {
        name: company.name,
        taxId: company.taxId ?? undefined,
        industry: company.industry ?? undefined,
        businessActivity: company.businessActivity ?? undefined,
        country: company.country ?? undefined,
        currency: company.currency ?? undefined,
      },
      year,
      baseYear: calc.baseYear,
      closedMonths: (await monthlyForecastService.getOrInit(companyId, year))?.closedMonths ?? 0,
      pnl: calc.pnl,
      balance: calc.balance,
    };

    console.log(`[MONTHLY-REPORT] Generating AI analysis for ${company.name} (${year})...`);
    const [prometheia, ejecutivo] = await Promise.all([
      generateMonthlyPrometheiaAnalysis(aiData),
      generateMonthlyEjecutivoAnalysis(aiData),
    ]);

    console.log('[MONTHLY-REPORT] Generating DOCX files...');
    const docxData: DocxMonthlyReportData = {
      company: aiData.company,
      year,
      baseYear: calc.baseYear,
      closedMonths: aiData.closedMonths,
      pnl: calc.pnl,
      balance: calc.balance,
    };

    const prometheiaFilename = `monthly_report_${report.id}_${year}_prometheia.docx`;
    const ejecutivoFilename  = `monthly_report_${report.id}_${year}_ejecutivo.docx`;
    const prometheiaPath = path.join(REPORTS_DIR, prometheiaFilename);
    const ejecutivoPath  = path.join(REPORTS_DIR, ejecutivoFilename);

    await Promise.all([
      generateMonthlyNarrativeDocx(docxData, prometheia, prometheiaPath),
      generateMonthlyExecutiveSummaryDocx(docxData, ejecutivo, ejecutivoPath),
    ]);

    let storedPrometheiaPath = prometheiaFilename;
    let storedEjecutivoPath = ejecutivoFilename;

    if (isS3Enabled()) {
      console.log('[MONTHLY-REPORT] Uploading files to S3...');
      const s3Prefix = `monthly-reports/${report.id}`;
      const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      [storedPrometheiaPath, storedEjecutivoPath] = await Promise.all([
        uploadToS3(prometheiaPath, `${s3Prefix}/${prometheiaFilename}`, docxMime),
        uploadToS3(ejecutivoPath, `${s3Prefix}/${ejecutivoFilename}`, docxMime),
      ]);
    }

    await prisma.monthlyReport.update({
      where: { id: report.id },
      data: {
        status: 'COMPLETED',
        aiAnalysisPrometheia: prometheia as any,
        aiAnalysisEjecutivo: ejecutivo as any,
        docxPathPrometheia: storedPrometheiaPath,
        docxPathEjecutivo: storedEjecutivoPath,
        generatedAt: new Date(),
      },
    });

    console.log(`[MONTHLY-REPORT] Report ${report.id} generated successfully`);
    return report.id;

  } catch (error) {
    await prisma.monthlyReport.update({
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
// Never expose the raw downloadCode to the client — only whether one is set.
export async function getCompanyMonthlyReports(companyId: string) {
  const rows = await prisma.monthlyReport.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, year: true, status: true, generatedAt: true,
      docxPathPrometheia: true, docxPathEjecutivo: true,
      downloadCode: true, errorMessage: true, createdAt: true,
    },
  });
  return rows.map(({ downloadCode, ...r }) => ({ ...r, hasDownloadCode: !!downloadCode }));
}

// ─── Get single report ─────────────────────────────────────────────────────────
export async function getMonthlyReport(reportId: string) {
  return prisma.monthlyReport.findUnique({
    where: { id: reportId },
    include: { company: { select: { name: true, taxId: true } } },
  });
}

// ─── File path for download ────────────────────────────────────────────────────
export function getMonthlyReportFilePath(filename: string): string {
  return path.join(REPORTS_DIR, filename);
}

// ─── Download code ──────────────────────────────────────────────────────────
export async function setMonthlyReportDownloadCode(reportId: string, code: string) {
  return prisma.monthlyReport.update({ where: { id: reportId }, data: { downloadCode: code } });
}

export { convertDocxToPdf };
