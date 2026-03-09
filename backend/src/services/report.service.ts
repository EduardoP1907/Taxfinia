/**
 * Report Service
 * Orchestrates PDF + DOCX generation using financial data + Claude AI
 */

import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import { generateAIAnalysis, type FinancialDataForAI } from './ai-analysis.service';
import { generateAnalyticalPDF, type PDFReportData } from '../utils/pdf-generator';
import { generateNarrativeDocx, type DocxReportData } from '../utils/docx-generator';
import { Decimal } from '@prisma/client/runtime/library';

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

// ─── Build financial data structures ─────────────────────────────────────────
async function buildFinancialData(companyId: string) {
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
        orderBy: { year: 'desc' },
      },
      projections: {
        where: { wacc: { not: null } }, // solo escenarios con DCF calculado
        orderBy: { updatedAt: 'desc' },  // el más recientemente actualizado
        take: 1,
      },
    },
  });

  if (!company) throw new Error('Empresa no encontrada');

  const validYears = company.fiscalYears.filter(fy => fy.balanceSheet && fy.incomeStatement);
  if (validYears.length === 0) throw new Error('No hay datos financieros disponibles para esta empresa');

  const years = validYears.map(fy => fy.year);
  const latestYear = years[0]; // already sorted desc

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

  // DCF data from projections
  const projection = company.projections?.[0];
  const dcfData = projection ? {
    wacc: toNumOpt(projection.wacc),
    equityValue: toNumOpt(projection.equityValue),
    terminalGrowthRate: toNumOpt(projection.terminalGrowthRate),
  } : undefined;

  return {
    company: {
      name: company.name,
      taxId: company.taxId ?? undefined,
      industry: company.industry ?? undefined,
      businessActivity: (company as any).businessActivity ?? undefined,
      country: company.country,
      currency: company.currency,
    },
    years,
    latestYear,
    incomeData,
    balanceData,
    ratiosData,
    dcfData,
  };
}

// ─── Main: Generate Report ────────────────────────────────────────────────────
export async function generateReport(companyId: string, userId: string, year?: number): Promise<string> {
  ensureReportsDir();

  // Fetch financial data
  const financialData = await buildFinancialData(companyId);
  // Use requested year only if data exists for it; otherwise fall back to latest available
  const reportYear = (year && financialData.years.includes(year))
    ? year
    : financialData.latestYear;

  // Create report record in DB (status: GENERATING)
  const report = await prisma.report.create({
    data: {
      companyId,
      userId,
      year: reportYear,
      status: 'GENERATING',
    },
  });

  try {
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

    // ── Step 2: Generate PDF ──
    console.log('[REPORT] Generating PDF...');
    const pdfFilename = `report_${report.id}_${reportYear}.pdf`;
    const pdfPath = path.join(REPORTS_DIR, pdfFilename);

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
    await generateAnalyticalPDF(pdfData, pdfPath);

    // ── Step 3: Generate DOCX ──
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

    // ── Step 4: Update report record ──
    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: 'COMPLETED',
        aiAnalysis: aiAnalysis as any,
        pdfPath: pdfFilename,
        docxPath: docxFilename,
        generatedAt: new Date(),
      },
    });

    console.log(`[REPORT] Report ${report.id} generated successfully`);
    return report.id;

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
  return prisma.report.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      year: true,
      status: true,
      generatedAt: true,
      pdfPath: true,
      docxPath: true,
      errorMessage: true,
      createdAt: true,
    },
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
