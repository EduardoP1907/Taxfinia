/**
 * Comparison Financial Data Service
 * Builds the FinancialDataForAI-shaped payload for the two comparison reports
 * (Forecast vs Anual / Forecast vs Budget vs Anual), blending real annual
 * FiscalYear data with synthetic periods derived from the Forecast/Budget
 * engine (monthly-forecast.service.ts), which has no DB-backed CalculatedRatios
 * row of its own.
 */

import prisma from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import * as ratios from '../utils/ratios';
import type { BalanceSheetData, IncomeStatementData } from '../utils/ratios';
import { buildFinancialData } from './report.service';
import { monthlyForecastService, type MonthlyForecastResult } from './monthly-forecast.service';
import type { FinancialDataForAI } from './ai-analysis.service';

export type ComparisonReportType = 'FORECAST_VS_ANNUAL' | 'FORECAST_BUDGET_VS_ANNUAL';

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  annualYears: number[];
  forecastYear: number;
  budgetYear?: number;
}

export interface ComparisonFinancialDataResult {
  financialData: FinancialDataForAI;
  periodLabels: Record<number, string>;
  annualYears: number[];
  forecastYear: number;
  budgetYear?: number;
}

function toNum(value: Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : parseFloat(value.toString());
}

// ─── Eligibility ────────────────────────────────────────────────────────────

async function getLastThreeAnnualYears(companyId: string): Promise<number[]> {
  const years = await prisma.fiscalYear.findMany({
    where: {
      companyId,
      quarter: 0,
      month: 0,
      incomeStatement: { isNot: null },
      balanceSheet: { isNot: null },
    },
    orderBy: { year: 'desc' },
    take: 3,
    select: { year: true },
  });
  return years.map(y => y.year).sort((a, b) => a - b);
}

export async function checkEligibility(
  companyId: string,
  userId: string,
  type: ComparisonReportType,
): Promise<EligibilityResult> {
  const company = await prisma.company.findFirst({ where: { id: companyId, userId, deletedAt: null } });
  if (!company) throw new Error('Empresa no encontrada');

  const forecastYear = new Date().getFullYear();
  const budgetYear = forecastYear + 1;

  const annualYears = await getLastThreeAnnualYears(companyId);
  if (annualYears.length < 3) {
    return {
      eligible: false,
      reason: `Se requieren 3 años de datos anuales completos para este informe. Actualmente hay ${annualYears.length} registrado${annualYears.length === 1 ? '' : 's'}.`,
      annualYears, forecastYear, budgetYear,
    };
  }

  const forecastConfig = await prisma.monthlyForecast.findUnique({
    where: { companyId_year: { companyId, year: forecastYear } },
  });
  if (!forecastConfig) {
    return {
      eligible: false,
      reason: `Completa primero el Forecast ${forecastYear} antes de generar este informe.`,
      annualYears, forecastYear, budgetYear,
    };
  }

  if (type === 'FORECAST_BUDGET_VS_ANNUAL') {
    const budgetConfig = await prisma.monthlyForecast.findUnique({
      where: { companyId_year: { companyId, year: budgetYear } },
    });
    if (!budgetConfig) {
      return {
        eligible: false,
        reason: `Completa primero el Budget ${budgetYear} antes de generar este informe.`,
        annualYears, forecastYear, budgetYear,
      };
    }
  }

  return {
    eligible: true,
    annualYears, forecastYear,
    budgetYear: type === 'FORECAST_BUDGET_VS_ANNUAL' ? budgetYear : undefined,
  };
}

// ─── Reconstruct IncomeStatementData/BalanceSheetData from a Forecast/Budget calc ──
//
// The Forecast/Budget engine pre-combines fields that the ratios engine needs
// separate (costOfSales+staffCostsSales, adminExpenses+staffCostsAdmin+depreciation,
// and a single "equity" figure instead of shareCapital/reserves/retainedEarnings).
// Two documented approximations bridge the gap:
//  - depreciation for the period scales with revenue from the last real base year
//    (depreciation_period = baseDepreciation * revenue_period / baseRevenue)
//  - retainedEarnings_period = equity_period - baseShareCapital (assumes share
//    capital is unchanged, consistent with the Forecast engine not modeling it)

interface PeriodBase {
  baseDepreciation: number;
  baseRevenue: number;
  baseShareCapital: number;
}

function buildPeriodStatements(
  calc: MonthlyForecastResult,
  base: PeriodBase,
): { income: IncomeStatementData; balance: BalanceSheetData } {
  const { annualPnL, annualBalance } = calc;

  const depreciation = base.baseRevenue !== 0
    ? base.baseDepreciation * (annualPnL.revenue / base.baseRevenue)
    : base.baseDepreciation;
  const adminExpensesExclDepr = annualPnL.adminExpenses - depreciation;
  const retainedEarnings = annualBalance.equity - base.baseShareCapital;

  const income: IncomeStatementData = {
    revenue: annualPnL.revenue,
    otherOperatingIncome: 0,
    costOfSales: annualPnL.costOfSales,
    staffCostsSales: 0,
    adminExpenses: adminExpensesExclDepr,
    staffCostsAdmin: 0,
    depreciation,
    exceptionalIncome: annualPnL.exceptionalIncome,
    exceptionalExpenses: annualPnL.exceptionalExpenses,
    financialIncome: annualPnL.financialIncome,
    financialExpenses: annualPnL.financialExpenses,
    incomeTax: annualPnL.incomeTax,
  };

  const balance: BalanceSheetData = {
    tangibleAssets: annualBalance.fixedAssets,
    intangibleAssets: 0,
    financialInvestmentsLp: annualBalance.financialInvestmentsLp,
    otherNoncurrentAssets: annualBalance.otherNoncurrentAssets,
    inventory: annualBalance.inventory,
    accountsReceivable: annualBalance.accountsReceivable,
    otherReceivables: annualBalance.otherReceivables,
    taxReceivables: annualBalance.taxReceivables,
    cashEquivalents: annualBalance.cashEquivalents,
    shareCapital: base.baseShareCapital,
    reserves: 0,
    retainedEarnings,
    treasuryStock: 0,
    provisionsLp: annualBalance.provisionsLp,
    bankDebtLp: annualBalance.bankDebtLp,
    otherLiabilitiesLp: annualBalance.otherLiabilitiesLp,
    provisionsSp: annualBalance.provisionsSp,
    bankDebtSp: annualBalance.bankDebtSp,
    accountsPayable: annualBalance.accountsPayable,
    taxLiabilities: annualBalance.taxLiabilities,
    otherLiabilitiesSp: annualBalance.otherLiabilitiesSp,
  };

  return { income, balance };
}

// Mirrors the exact shape/formulas ratios.service.ts uses per fiscal year,
// but returns the lighter FinancialDataForAI subset instead of the full
// CalculatedRatios row (there is no DB row to persist for a synthetic period).
function buildPeriodEntry(income: IncomeStatementData, balance: BalanceSheetData) {
  const totalCostOfSales = income.costOfSales + income.staffCostsSales;
  const totalAdminExpenses = income.adminExpenses + income.staffCostsAdmin;

  const grossMargin = ratios.calculateGrossMargin(income.revenue, totalCostOfSales);
  const ebitda = ratios.calculateEBITDA(income.revenue, totalCostOfSales, income.adminExpenses, income.staffCostsAdmin);
  const operatingResult = ratios.calculateOperatingIncome(
    income.revenue, totalCostOfSales, income.adminExpenses, income.staffCostsAdmin, income.depreciation,
  );
  const ebit = ratios.calculateEBIT(
    income.revenue, totalCostOfSales, income.adminExpenses, income.staffCostsAdmin, income.depreciation,
    income.exceptionalIncome, income.exceptionalExpenses,
  );
  const ebt = ratios.calculateEBT(
    income.revenue, totalCostOfSales, income.adminExpenses, income.staffCostsAdmin, income.depreciation,
    income.exceptionalIncome, income.exceptionalExpenses, income.financialIncome, income.financialExpenses,
  );
  const netIncome = ratios.calculateNetIncome(
    income.revenue, totalCostOfSales, income.adminExpenses, income.staffCostsAdmin, income.depreciation,
    income.exceptionalIncome, income.exceptionalExpenses, income.financialIncome, income.financialExpenses, income.incomeTax,
  );

  const totalAssets = ratios.calculateTotalAssets(balance);
  const currentAssets = ratios.calculateCurrentAssets(balance);
  const nonCurrentAssets = ratios.calculateNonCurrentAssets(balance);
  const equity = ratios.calculateEquity(balance);
  const totalLiabilities = ratios.calculateTotalLiabilities(balance);
  const currentLiabilities = ratios.calculateCurrentLiabilities(balance);
  const nonCurrentLiabilities = ratios.calculateNonCurrentLiabilities(balance);
  const workingCapital = ratios.calculateWorkingCapital(balance);

  const revenue = income.revenue;

  const incomeEntry: FinancialDataForAI['incomeData'][number] = {
    revenue,
    costOfSales: totalCostOfSales,
    grossMargin,
    grossMarginPct: revenue > 0 ? grossMargin / revenue * 100 : 0,
    adminExpenses: totalAdminExpenses,
    ebitda,
    ebitdaPct: revenue > 0 ? ebitda / revenue * 100 : 0,
    depreciation: income.depreciation,
    operatingResult,
    operatingResultPct: revenue > 0 ? operatingResult / revenue * 100 : 0,
    exceptionalResult: income.exceptionalIncome - income.exceptionalExpenses,
    financialResult: income.financialIncome - income.financialExpenses,
    ebt,
    ebtPct: revenue > 0 ? ebt / revenue * 100 : 0,
    incomeTax: income.incomeTax,
    netIncome,
    netMarginPct: revenue > 0 ? netIncome / revenue * 100 : 0,
  };

  const balanceEntry: FinancialDataForAI['balanceData'][number] = {
    totalAssets,
    nonCurrentAssets,
    currentAssets,
    inventory: balance.inventory,
    accountsReceivable: balance.accountsReceivable + balance.otherReceivables + balance.taxReceivables,
    cash: balance.cashEquivalents,
    equity,
    nonCurrentLiabilities,
    currentLiabilities,
    totalDebt: nonCurrentLiabilities + currentLiabilities,
    workingCapital,
  };

  const ratiosEntry: FinancialDataForAI['ratiosData'][number] = {
    currentRatio: ratios.calculateCurrentRatio(balance),
    quickRatio: ratios.calculateAcidTest(balance),
    cashRatio: ratios.calculateCashRatio(balance),
    debtToEquity: ratios.calculateDebtToEquityRatio(balance),
    debtToAssets: ratios.calculateDebtToAssetsRatio(balance),
    debtToEbitda: ratios.calculateDebtToEBITDA(balance, ebitda),
    roe: ratios.calculateROE(netIncome, equity),
    roa: ratios.calculateROA(ebitda, income.depreciation, totalAssets),
    grossMargin: ratios.calculateGrossMarginPercent(revenue, totalCostOfSales),
    ebitdaMargin: ratios.calculateEBITDAMargin(ebitda, revenue),
    netMargin: ratios.calculateNetMargin(netIncome, revenue),
    assetTurnover: ratios.calculateAssetTurnover(revenue, totalAssets),
    daysSalesOutstanding: ratios.calculateDaysSalesOutstanding(balance.accountsReceivable, revenue),
    daysPayableOutstanding: ratios.calculateDaysPayableOutstanding(balance.accountsPayable, totalCostOfSales),
    altmanZScore: ratios.calculateAltmanZScore(
      workingCapital, balance.retainedEarnings, ebit, equity, totalAssets, totalLiabilities, revenue,
    ),
  };

  return { incomeEntry, balanceEntry, ratiosEntry };
}

// ─── Main builder ───────────────────────────────────────────────────────────

export async function buildComparisonFinancialData(
  companyId: string,
  userId: string,
  type: ComparisonReportType,
): Promise<ComparisonFinancialDataResult> {
  const elig = await checkEligibility(companyId, userId, type);
  if (!elig.eligible) throw new Error(elig.reason);

  const { annualYears, forecastYear, budgetYear } = elig;

  // Real years: reuse the same builder the annual Prometheia report uses, then
  // keep only the last 3 years so both pipelines stay driven by one source of truth.
  const allReal = await buildFinancialData(companyId);

  const incomeData: FinancialDataForAI['incomeData'] = {};
  const balanceData: FinancialDataForAI['balanceData'] = {};
  const ratiosData: FinancialDataForAI['ratiosData'] = {};
  const periodLabels: Record<number, string> = {};

  for (const y of annualYears) {
    incomeData[y] = allReal.incomeData[y];
    balanceData[y] = allReal.balanceData[y];
    ratiosData[y] = allReal.ratiosData[y];
    periodLabels[y] = `${y} (Real)`;
  }

  // Forecast period — driven by the same base annual year the Forecast engine itself uses.
  const forecastCalc = await monthlyForecastService.calculate(companyId, userId, forecastYear, { mode: 'forecast' });
  const baseFy = await prisma.fiscalYear.findFirst({
    where: { companyId, year: forecastCalc.baseYear, quarter: 0, month: 0 },
    include: { incomeStatement: true, balanceSheet: true },
  });
  if (!baseFy?.incomeStatement || !baseFy?.balanceSheet) {
    throw new Error('No se pudo determinar el año base del Forecast para este informe.');
  }
  const base: PeriodBase = {
    baseDepreciation: toNum(baseFy.incomeStatement.depreciation),
    baseRevenue: toNum(baseFy.incomeStatement.revenue),
    baseShareCapital: toNum(baseFy.balanceSheet.shareCapital),
  };

  const forecastStatements = buildPeriodStatements(forecastCalc, base);
  const forecastEntry = buildPeriodEntry(forecastStatements.income, forecastStatements.balance);
  incomeData[forecastYear] = forecastEntry.incomeEntry;
  balanceData[forecastYear] = forecastEntry.balanceEntry;
  ratiosData[forecastYear] = forecastEntry.ratiosEntry;
  periodLabels[forecastYear] = `${forecastYear} (Forecast)`;

  const years = [...annualYears, forecastYear];

  if (type === 'FORECAST_BUDGET_VS_ANNUAL' && budgetYear) {
    const budgetCalc = await monthlyForecastService.calculate(companyId, userId, budgetYear, { mode: 'budget' });
    const budgetStatements = buildPeriodStatements(budgetCalc, base);
    const budgetEntry = buildPeriodEntry(budgetStatements.income, budgetStatements.balance);
    incomeData[budgetYear] = budgetEntry.incomeEntry;
    balanceData[budgetYear] = budgetEntry.balanceEntry;
    ratiosData[budgetYear] = budgetEntry.ratiosEntry;
    periodLabels[budgetYear] = `${budgetYear} (Budget)`;
    years.push(budgetYear);
  }

  const financialData: FinancialDataForAI = {
    company: allReal.company,
    years,
    latestYear: forecastYear,
    incomeData,
    balanceData,
    ratiosData,
    dcfData: undefined,
  };

  return { financialData, periodLabels, annualYears, forecastYear, budgetYear };
}
