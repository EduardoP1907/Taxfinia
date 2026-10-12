/**
 * Report Service
 * Orchestrates PDF + DOCX generation using financial data + Claude AI
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import prisma from '../config/database';
import { generateAIAnalysis, type FinancialDataForAI, type AIAnalysisResult } from './ai-analysis.service';
import type { PDFReportData } from '../utils/pdf-generator';
import { generateNarrativeDocx, type DocxReportData } from '../utils/docx-generator';
import { generateExecutiveSummaryDocx } from '../utils/docx-executive-summary';
import { convertDocxToPdf } from '../utils/docx-to-pdf';
import { Decimal } from '@prisma/client/runtime/library';
import { lockCompany } from './company.service';
import { isS3Enabled, uploadToS3 } from '../utils/s3';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toNum(value: Decimal | null | undefined): number {
  if (!value) return 0;
  return parseFloat(value.toString());
}

function toNumOpt(value: Decimal | null | undefined): number | null {
  if (value == null) return null;
  return parseFloat(value.toString());
}

const REPORTS_DIR = path.join(__dirname, '../../uploads/reports');

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

// ─── DCF data (Hoja 4.3) ─────────────────────────────────────────────────────
// Devuelve el WACC y el valor de empresa tal como se presentan en la Hoja 4.3.
// - Prefiere el escenario cuyo año base coincide con el año del informe.
// - Si el escenario no tiene WACC guardado, lo estima con IA (igual que la Hoja 4.3).
// - Si el valor de empresa no está persistido, lo calcula con la misma fórmula
//   que la Hoja 4.3 (PV de FCFs a 5 años + PV del valor terminal).
export async function getDcfData(companyId: string, preferredBaseYear?: number) {
  const scenarios = await prisma.projectionScenario.findMany({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
    include: { projections: { orderBy: { year: 'asc' } } },
  });
  if (scenarios.length === 0) return undefined;

  const withWacc = scenarios.filter(s => s.wacc != null);
  let scenario =
    withWacc.find(s => s.baseYear === preferredBaseYear) ??
    withWacc[0] ??
    scenarios.find(s => s.baseYear === preferredBaseYear) ??
    scenarios[0];

  let wacc = toNumOpt(scenario.wacc);
  let terminalGrowthRate = toNumOpt(scenario.terminalGrowthRate);

  if (wacc == null) {
    try {
      const { refreshWaccForScenario } = await import('../controllers/projections.controller');
      const estimate = await refreshWaccForScenario(scenario.id);
      wacc = estimate.wacc;
      terminalGrowthRate = terminalGrowthRate ?? estimate.terminalGrowthRate;
    } catch (err) {
      console.warn('[REPORT] No se pudo estimar el WACC para el informe:', err);
      return undefined;
    }
  }

  let equityValue = toNumOpt(scenario.equityValue);
  if (equityValue == null && wacc != null && wacc > 0) {
    const g = terminalGrowthRate ?? 0;
    const flows = scenario.projections.slice(1, 6).map((p, i) => {
      const fcf = toNum(p.freeCashFlow);
      const discountFactor = 1 / Math.pow(1 + wacc!, i + 1);
      return { fcf, discountFactor };
    });
    if (flows.length > 0 && wacc > g) {
      const sumPv = flows.reduce((s, f) => s + f.fcf * f.discountFactor, 0);
      const last = flows[flows.length - 1];
      const terminalValue = (last.fcf * (1 + g)) / (wacc - g);
      equityValue = sumPv + terminalValue * last.discountFactor;
    }
  }

  return { wacc, equityValue, terminalGrowthRate };
}

// ─── Build financial data structures ─────────────────────────────────────────
export async function buildFinancialData(companyId: string, preferredBaseYear?: number) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      fiscalYears: {
        include: {
          balanceSheet: true,
          incomeStatement: true,
          cashFlow: true,
          additionalData: true,
          calculatedRatios: true,
        },
        orderBy: { year: 'asc' },
      },
    },
  });

  if (!company) throw new Error('Empresa no encontrada');

  const validYears = company.fiscalYears.filter(fy => fy.balanceSheet && fy.incomeStatement);
  if (validYears.length === 0) throw new Error('No hay datos financieros disponibles para esta empresa');

  const years = validYears.map(fy => fy.year);
  const latestYear = years[years.length - 1]; // last element = most recent (sorted asc)

  // Build income data
  const incomeData: FinancialDataForAI['incomeData'] = {};
  const balanceData: FinancialDataForAI['balanceData'] = {};
  const ratiosData: FinancialDataForAI['ratiosData'] = {};

  for (const fy of validYears) {
    const bs = fy.balanceSheet!;
    const is = fy.incomeStatement!;
    const rat = fy.calculatedRatios;

    // Income calculations
    const revenue = toNum(is.revenue) + toNum(is.otherOperatingIncome);
    const costOfSales = toNum(is.costOfSales) + toNum(is.staffCostsSales);
    const grossMargin = revenue - costOfSales;
    const grossMarginPct = revenue > 0 ? grossMargin / revenue * 100 : 0;
    const adminExpenses = toNum(is.adminExpenses) + toNum(is.staffCostsAdmin);
    const depreciation = toNum(is.depreciation);
    const ebitda = grossMargin - adminExpenses;
    const ebitdaPct = revenue > 0 ? ebitda / revenue * 100 : 0;
    const operatingResult = ebitda - depreciation;
    const operatingResultPct = revenue > 0 ? operatingResult / revenue * 100 : 0;
    const exceptionalResult = toNum(is.exceptionalIncome) - toNum(is.exceptionalExpenses);
    const financialResult = toNum(is.financialIncome) - toNum(is.financialExpenses);
    const ebt = operatingResult + exceptionalResult + financialResult;
    const ebtPct = revenue > 0 ? ebt / revenue * 100 : 0;
    const incomeTax = toNum(is.incomeTax);
    const netIncome = ebt - incomeTax;
    const netMarginPct = revenue > 0 ? netIncome / revenue * 100 : 0;

    incomeData[fy.year] = {
      revenue,
      costOfSales,
      grossMargin,
      grossMarginPct,
      adminExpenses,
      ebitda,
      ebitdaPct,
      depreciation,
      operatingResult,
      operatingResultPct,
      exceptionalResult,
      financialResult,
      ebt,
      ebtPct,
      incomeTax,
      netIncome,
      netMarginPct,
    };

    // Balance calculations
    const nonCurrentAssets = toNum(bs.tangibleAssets) + toNum(bs.intangibleAssets) +
      toNum(bs.financialInvestmentsLp) + toNum(bs.otherNoncurrentAssets);
    const inventory = toNum(bs.inventory);
    const accountsReceivable = toNum(bs.accountsReceivable) + toNum(bs.otherReceivables) + toNum(bs.taxReceivables);
    const cash = toNum(bs.cashEquivalents);
    const currentAssets = inventory + accountsReceivable + cash;
    const totalAssets = nonCurrentAssets + currentAssets;
    const equity = toNum(bs.shareCapital) + toNum(bs.reserves) + toNum(bs.retainedEarnings) - toNum(bs.treasuryStock);
    const nonCurrentLiabilities = toNum(bs.provisionsLp) + toNum(bs.bankDebtLp) + toNum(bs.otherLiabilitiesLp);
    const currentLiabilities = toNum(bs.provisionsSp) + toNum(bs.bankDebtSp) +
      toNum(bs.accountsPayable) + toNum(bs.taxLiabilities) + toNum(bs.otherLiabilitiesSp);
    const totalDebt = nonCurrentLiabilities + currentLiabilities;
    const workingCapital = currentAssets - currentLiabilities;

    balanceData[fy.year] = {
      totalAssets,
      nonCurrentAssets,
      currentAssets,
      inventory,
      accountsReceivable,
      cash,
      equity,
      nonCurrentLiabilities,
      currentLiabilities,
      totalDebt,
      workingCapital,
    };

    // Ratios data
    if (rat) {
      ratiosData[fy.year] = {
        currentRatio: toNumOpt(rat.currentRatio),
        quickRatio: toNumOpt(rat.quickRatio),
        cashRatio: toNumOpt(rat.cashRatio),
        debtToEquity: toNumOpt(rat.debtToEquity),
        debtToAssets: toNumOpt(rat.debtToAssets),
        debtToEbitda: toNumOpt(rat.debtToEbitda),
        roe: toNumOpt(rat.roe),
        roa: toNumOpt(rat.roa),
        grossMargin: toNumOpt(rat.grossMargin),
        ebitdaMargin: toNumOpt(rat.ebitdaMargin),
        netMargin: toNumOpt(rat.netMargin),
        assetTurnover: toNumOpt(rat.assetTurnover),
        daysSalesOutstanding: toNumOpt(rat.daysSalesOutstanding),
        daysPayableOutstanding: toNumOpt(rat.daysPayableOutstanding),
        altmanZScore: toNumOpt(rat.altmanZScore),
      };
    } else {
      ratiosData[fy.year] = {};
    }
  }

  // DCF data from projections (Hoja 4.3)
  const dcfData = await getDcfData(companyId, preferredBaseYear ?? latestYear);

  return {
    company: {
      name: company.name,
      taxId: company.taxId ?? undefined,
      industry: company.industry ?? undefined,
      businessActivity: (company as any).businessActivity ?? undefined,
      country: company.country,
      currency: company.currency,
      deedDocumentText: company.deedDocumentText ?? undefined,
    },
    years,
    latestYear,
    incomeData,
    balanceData,
    ratiosData,
    dcfData,
  };
}

// A GENERATING record older than this is considered abandoned (e.g. the server
// restarted mid-generation) and a new one may be started.
const STALE_GENERATION_MS = 10 * 60 * 1000;

// ─── Start: validate + create GENERATING record (returns immediately) ────────
// Generation takes ~1 min (AI), longer than the proxy/CloudFront request timeout,
// so the HTTP request only starts it; the client polls the report list.
export async function startReport(
  companyId: string,
  userId: string,
  year?: number,
): Promise<{ reportId: string; alreadyRunning: boolean }> {
  // Validates that there is financial data (throws otherwise)
  const financialData = await buildFinancialData(companyId, year);
  // Use requested year only if data exists for it; otherwise fall back to latest available
  const reportYear = (year && financialData.years.includes(year))
    ? year
    : financialData.latestYear;

  const running = await prisma.report.findFirst({
    where: {
      companyId,
      year: reportYear,
      status: 'GENERATING',
      updatedAt: { gt: new Date(Date.now() - STALE_GENERATION_MS) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (running) return { reportId: running.id, alreadyRunning: true };

  const report = await prisma.report.create({
    data: { companyId, userId, year: reportYear, status: 'GENERATING' },
  });
  return { reportId: report.id, alreadyRunning: false };
}

// ─── Main: Generate Report (synchronous, start → run) ─────────────────────────
export async function generateReport(companyId: string, userId: string, year?: number): Promise<string> {
  const { reportId } = await startReport(companyId, userId, year);
  await runReport(reportId);
  return reportId;
}

// ─── Run: AI → DOCX → S3 → COMPLETED / FAILED ─────────────────────────────────
export async function runReport(reportId: string): Promise<void> {
  ensureReportsDir();
  const report = await prisma.report.findUniqueOrThrow({ where: { id: reportId } });
  const { companyId, userId, year: reportYear } = report;

  try {
    const financialData = await buildFinancialData(companyId, reportYear);

    // Check if user is on TRIAL plan and has free reports remaining
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true, freeReportsUsed: true },
    });
    const isFreeTrialReport = user?.planType === 'TRIAL' && (user?.freeReportsUsed ?? 0) < 2;

    // ── Step 1: Generate AI narrative analysis ──
    console.log(`[REPORT] Generating AI analysis for ${financialData.company.name}...`);
    const aiData: FinancialDataForAI = {
      company: financialData.company,
      years: financialData.years,
      latestYear: reportYear,
      incomeData: financialData.incomeData,
      balanceData: financialData.balanceData,
      ratiosData: financialData.ratiosData,
      dcfData: financialData.dcfData,
    };

    const aiAnalysis = await generateAIAnalysis(aiData);

    // ── Step 2: Generate DOCX ──
    console.log('[REPORT] Generating DOCX...');
    const docxFilename = `report_${report.id}_${reportYear}.docx`;
    const docxPath = path.join(REPORTS_DIR, docxFilename);

    const docxData: DocxReportData = {
      company: {
        name: financialData.company.name,
        taxId: financialData.company.taxId,
        industry: financialData.company.industry,
        businessActivity: financialData.company.businessActivity,
        country: financialData.company.country,
        currency: financialData.company.currency,
      },
      latestYear: reportYear,
      years: financialData.years,
      dcfData: financialData.dcfData,
      aiAnalysis,
    };
    await generateNarrativeDocx(docxData, docxPath);

    // ── Step 3: Upload to S3 if configured, otherwise keep local ──
    let storedDocxPath = docxFilename;

    if (isS3Enabled()) {
      console.log('[REPORT] Uploading files to S3...');
      const s3Prefix = `reports/${report.id}`;
      storedDocxPath = await uploadToS3(docxPath, `${s3Prefix}/${docxFilename}`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      console.log('[REPORT] Files uploaded to S3 successfully');
    }

    // ── Step 4: Update report record ──
    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: 'COMPLETED',
        aiAnalysis: aiAnalysis as any,
        pdfPath: null,
        docxPath: storedDocxPath,
        generatedAt: new Date(),
        // TRIAL users get free reports (no download code required)
        ...(isFreeTrialReport ? { downloadCode: null } : {}),
      },
    });

    // Increment free reports counter for TRIAL users
    if (isFreeTrialReport) {
      await prisma.user.update({
        where: { id: userId },
        data: { freeReportsUsed: { increment: 1 } },
      });
    }

    // Lock the company so financial data cannot be modified after report generation
    await lockCompany(companyId).catch(err =>
      console.error('[REPORT] Failed to lock company:', err.message)
    );

    console.log(`[REPORT] Report ${report.id} generated successfully`);

  } catch (error) {
    // Update report status to FAILED
    await prisma.report.update({
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
export async function getCompanyReports(companyId: string) {
  const rows = await prisma.report.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      year: true,
      status: true,
      generatedAt: true,
      pdfPath: true,
      docxPath: true,
      downloadCode: true,
      errorMessage: true,
      createdAt: true,
    },
  });
  return rows.map(r => ({ ...r, hasDownloadCode: !!r.downloadCode }));
}

export async function setReportDownloadCode(reportId: string, code: string) {
  return prisma.report.update({
    where: { id: reportId },
    data: { downloadCode: code },
  });
}

// ─── Get single report ────────────────────────────────────────────────────────
export async function getReport(reportId: string) {
  return prisma.report.findUnique({
    where: { id: reportId },
    include: { company: { select: { name: true, taxId: true } } },
  });
}

// ─── Get file path for download ───────────────────────────────────────────────
export function getReportFilePath(filename: string): string {
  return path.join(REPORTS_DIR, filename);
}

// ─── Generate executive summary PDF on-demand ─────────────────────────────────
export async function generateExecutiveSummaryPdf(reportId: string): Promise<{
  pdfPath: string;
  companyName: string;
  year: number;
  cleanup: () => void;
}> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { company: { select: { name: true } } },
  });
  if (!report) throw new Error('Informe no encontrado');
  if (report.status !== 'COMPLETED') throw new Error('El informe aún no está completado');
  if (!report.aiAnalysis) throw new Error('Análisis IA no disponible para este informe');

  const aiAnalysis = report.aiAnalysis as unknown as AIAnalysisResult;
  const financialData = await buildFinancialData(report.companyId);

  const pdfData: PDFReportData = {
    company: {
      name: financialData.company.name,
      taxId: financialData.company.taxId,
      industry: financialData.company.industry,
      businessActivity: financialData.company.businessActivity,
      country: financialData.company.country,
      currency: financialData.company.currency,
    },
    years: financialData.years,
    incomeData: financialData.incomeData,
    balanceData: financialData.balanceData,
    ratiosData: financialData.ratiosData,
  };

  const tmpDocx = path.join(os.tmpdir(), `exec_summary_${reportId}.docx`);
  const tmpPdf  = path.join(os.tmpdir(), `exec_summary_${reportId}.pdf`);

  await generateExecutiveSummaryDocx(pdfData, aiAnalysis, tmpDocx);
  await convertDocxToPdf(tmpDocx, tmpPdf);
  try { fs.unlinkSync(tmpDocx); } catch {}

  return {
    pdfPath: tmpPdf,
    companyName: financialData.company.name,
    year: report.year,
    cleanup: () => { try { fs.unlinkSync(tmpPdf); } catch {} },
  };
}
