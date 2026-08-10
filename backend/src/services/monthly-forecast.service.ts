import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnnualPnL {
  revenue: number;
  costOfSales: number;     // costOfSales + staffCostsSales
  adminExpenses: number;   // adminExpenses + staffCostsAdmin + depreciation
  exceptionalIncome: number;
  exceptionalExpenses: number;
  financialIncome: number;
  financialExpenses: number;
  incomeTax: number;
}

interface AnnualBalance {
  fixedAssets: number;             // tangibleAssets + intangibleAssets
  otherNoncurrentAssets: number;
  financialInvestmentsLp: number;
  accountsReceivable: number;      // accountsReceivable + otherReceivables
  taxReceivables: number;
  cashEquivalents: number;
  inventory: number;               // costs driver
  equity: number;                  // shareCapital + reserves + retainedEarnings - treasuryStock (fixed)
  provisionsLp: number;
  bankDebtLp: number;
  otherLiabilitiesLp: number;
  provisionsSp: number;
  bankDebtSp: number;
  accountsPayable: number;         // costs driver
  taxLiabilities: number;
  otherLiabilitiesSp: number;
}

export interface MonthlyPnLRow {
  revenue: number;
  costOfSales: number;
  adminExpenses: number;
  grossMargin: number;
  operatingResult: number;
  exceptionalIncome: number;
  exceptionalExpenses: number;
  exceptionalResult: number;
  financialIncome: number;
  financialExpenses: number;
  financialResult: number;
  ebt: number;
  incomeTax: number;
  netIncome: number;
  isClosed: boolean;
}

export interface MonthlyBalanceRow {
  fixedAssets: number;
  otherNoncurrentAssets: number;
  financialInvestmentsLp: number;
  totalNoncurrentAssets: number;
  inventory: number;
  accountsReceivable: number;
  taxReceivables: number;
  cashEquivalents: number;
  totalCurrentAssets: number;
  totalAssets: number;
  equity: number;
  provisionsLp: number;
  bankDebtLp: number;
  otherLiabilitiesLp: number;
  totalNoncurrentLiabilities: number;
  provisionsSp: number;
  bankDebtSp: number;
  accountsPayable: number;
  taxLiabilities: number;
  otherLiabilitiesSp: number;
  totalCurrentLiabilities: number;
  totalEquityAndLiabilities: number;
  imbalance: number;
}

export interface MonthlyForecastResult {
  pnl: MonthlyPnLRow[];        // 12 rows (Jan–Dec)
  balance: MonthlyBalanceRow[]; // 12 rows (Jan–Dec)
  annualPnL: AnnualPnL;
  annualBalance: AnnualBalance;
  baseYear: number;             // actual annual data year used as base
}

// Leaf balance line items the user can manually override (excludes computed
// totals/subtotals and the "imbalance" check row, which are always derived).
export const BALANCE_OVERRIDE_KEYS = [
  'fixedAssets', 'otherNoncurrentAssets', 'financialInvestmentsLp',
  'inventory', 'accountsReceivable', 'taxReceivables', 'cashEquivalents',
  'equity', 'provisionsLp', 'bankDebtLp', 'otherLiabilitiesLp',
  'provisionsSp', 'bankDebtSp', 'accountsPayable', 'taxLiabilities', 'otherLiabilitiesSp',
] as const;

export type BalanceOverrideKey = typeof BALANCE_OVERRIDE_KEYS[number];

// { [fieldKey]: (number|null)[12] } — null means "use the calculated value".
export type BalanceOverrides = Partial<Record<BalanceOverrideKey, (number | null)[]>>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toNum(v: any): number {
  if (!v) return 0;
  return parseFloat(v.toString());
}

function jsonToArray(json: any, defaultVal = 0): number[] {
  const arr: number[] = Array.isArray(json) ? [...json] : [];
  while (arr.length < 12) arr.push(defaultVal);
  return arr.slice(0, 12).map(v => (typeof v === 'number' ? v : defaultVal));
}

function jsonToOverrideArray(json: any): (number | null)[] {
  const arr: (number | null)[] = Array.isArray(json) ? [...json] : [];
  while (arr.length < 12) arr.push(null);
  return arr.slice(0, 12).map(v => (typeof v === 'number' && !isNaN(v) ? v : null));
}

function normalizeBalanceOverrides(stored: any): BalanceOverrides {
  const result: BalanceOverrides = {};
  for (const key of BALANCE_OVERRIDE_KEYS) {
    result[key] = jsonToOverrideArray(stored?.[key]);
  }
  return result;
}

function buildAnnualPnL(is: any): AnnualPnL {
  return {
    revenue: toNum(is.revenue),
    costOfSales: toNum(is.costOfSales) + toNum(is.staffCostsSales),
    adminExpenses: toNum(is.adminExpenses) + toNum(is.staffCostsAdmin) + toNum(is.depreciation),
    exceptionalIncome: toNum(is.exceptionalIncome),
    exceptionalExpenses: toNum(is.exceptionalExpenses),
    financialIncome: toNum(is.financialIncome),
    financialExpenses: toNum(is.financialExpenses),
    incomeTax: toNum(is.incomeTax),
  };
}

function buildAnnualBalance(bs: any): AnnualBalance {
  return {
    fixedAssets: toNum(bs.tangibleAssets) + toNum(bs.intangibleAssets),
    otherNoncurrentAssets: toNum(bs.otherNoncurrentAssets),
    financialInvestmentsLp: toNum(bs.financialInvestmentsLp),
    accountsReceivable: toNum(bs.accountsReceivable) + toNum(bs.otherReceivables),
    taxReceivables: toNum(bs.taxReceivables),
    cashEquivalents: toNum(bs.cashEquivalents),
    inventory: toNum(bs.inventory),
    equity:
      toNum(bs.shareCapital) +
      toNum(bs.reserves) +
      toNum(bs.retainedEarnings) -
      toNum(bs.treasuryStock),
    provisionsLp: toNum(bs.provisionsLp),
    bankDebtLp: toNum(bs.bankDebtLp),
    otherLiabilitiesLp: toNum(bs.otherLiabilitiesLp),
    provisionsSp: toNum(bs.provisionsSp),
    bankDebtSp: toNum(bs.bankDebtSp),
    accountsPayable: toNum(bs.accountsPayable),
    taxLiabilities: toNum(bs.taxLiabilities),
    otherLiabilitiesSp: toNum(bs.otherLiabilitiesSp),
  };
}

// ─── Core calculation: monthly P&G ───────────────────────────────────────────
// Matches FCASTPPGG2026 logic:
//   Month 0 (Jan, projected) = base / 12
//   Month N (projected)      = prev * (1 + rate[N])
//   Closed months            = actual values entered by user

function calcMonthlyPnL(
  base: AnnualPnL,
  closedMonths: number,
  actual: Record<keyof AnnualPnL, number[]>,
  rates: Record<keyof AnnualPnL, number[]>,
): MonthlyPnLRow[] {
  const rows: MonthlyPnLRow[] = [];

  for (let m = 0; m < 12; m++) {
    const isClosed = m < closedMonths;
    let revenue: number, costOfSales: number, adminExpenses: number;
    let exceptionalIncome: number, exceptionalExpenses: number;
    let financialIncome: number, financialExpenses: number, incomeTax: number;

    if (isClosed) {
      revenue = actual.revenue[m];
      costOfSales = actual.costOfSales[m];
      adminExpenses = actual.adminExpenses[m];
      exceptionalIncome = actual.exceptionalIncome[m];
      exceptionalExpenses = actual.exceptionalExpenses[m];
      financialIncome = actual.financialIncome[m];
      financialExpenses = actual.financialExpenses[m];
      incomeTax = actual.incomeTax[m];
    } else if (m === 0) {
      // First projected month: base / 12 (matches Excel FCASTPPGG row 4 January formula)
      revenue = base.revenue / 12;
      costOfSales = base.costOfSales / 12;
      adminExpenses = base.adminExpenses / 12;
      exceptionalIncome = base.exceptionalIncome / 12;
      exceptionalExpenses = base.exceptionalExpenses / 12;
      financialIncome = base.financialIncome / 12;
      financialExpenses = base.financialExpenses / 12;
      incomeTax = base.incomeTax / 12;
    } else {
      const prev = rows[m - 1];
      revenue = prev.revenue * (1 + rates.revenue[m]);
      costOfSales = prev.costOfSales * (1 + rates.costOfSales[m]);
      adminExpenses = prev.adminExpenses * (1 + rates.adminExpenses[m]);
      exceptionalIncome = prev.exceptionalIncome * (1 + rates.exceptionalIncome[m]);
      exceptionalExpenses = prev.exceptionalExpenses * (1 + rates.exceptionalExpenses[m]);
      financialIncome = prev.financialIncome * (1 + rates.financialIncome[m]);
      financialExpenses = prev.financialExpenses * (1 + rates.financialExpenses[m]);
      incomeTax = prev.incomeTax * (1 + rates.incomeTax[m]);
    }

    const grossMargin = revenue - costOfSales;
    const operatingResult = grossMargin - adminExpenses;
    const exceptionalResult = exceptionalIncome - exceptionalExpenses;
    const financialResult = financialIncome - financialExpenses;
    const ebt = operatingResult + exceptionalResult + financialResult;
    const netIncome = ebt - incomeTax;

    rows.push({
      revenue, costOfSales, adminExpenses,
      grossMargin, operatingResult,
      exceptionalIncome, exceptionalExpenses, exceptionalResult,
      financialIncome, financialExpenses, financialResult,
      ebt, incomeTax, netIncome, isClosed,
    });
  }

  return rows;
}

// ─── Core calculation: monthly balance ───────────────────────────────────────
// Matches FCASTBCE2026 logic exactly:
//   factor = (cumSales_N - expectedFlat_N) / annualSales + 1
//   item_N = factor * item_base            (revenue-driver items)
//   item_N = costsF * item_base            (costs-driver: inventory, accountsPayable)
//   equity_N = equity_(N-1) + netIncome_N  (Sheet row 16: C16 = B16 + FCASTPPGG2026!C21)
//   fixedAssets_N = factor*base + plug_N   (Sheet row 4: C4 = ... + C31 "CUADRATURA")
//     where plug_N = TotalPasivoYPN_N - TotalActivoSinPlug_N, forcing Activo = Pasivo+PN
//     every month exactly like the Excel model's balancing plug.

function calcMonthlyBalance(
  base: AnnualBalance,
  annualRevenue: number,
  annualCosts: number,
  pnl: MonthlyPnLRow[],
  overrides: BalanceOverrides = {},
): MonthlyBalanceRow[] {
  const rows: MonthlyBalanceRow[] = [];
  let cumRevenue = 0;
  let cumCosts = 0;
  let equity = base.equity;

  // Manual override for a given field/month, or null if none was entered.
  const ov = (key: BalanceOverrideKey, m: number): number | null => {
    const v = overrides[key]?.[m];
    return typeof v === 'number' && !isNaN(v) ? v : null;
  };

  for (let m = 0; m < 12; m++) {
    cumRevenue += pnl[m].revenue;
    cumCosts += pnl[m].costOfSales;

    const expectedFlatRev = (annualRevenue / 12) * (m + 1);
    const expectedFlatCst = (annualCosts / 12) * (m + 1);

    const rf = annualRevenue !== 0 ? (cumRevenue - expectedFlatRev) / annualRevenue + 1 : 1;
    const cf = annualCosts !== 0 ? (cumCosts - expectedFlatCst) / annualCosts + 1 : 1;

    // Patrimonio Neto rolls forward with net income (fixed only for month 0, the base),
    // unless the user entered a manual override for this month — in which case later
    // months keep rolling forward from the overridden value.
    if (m > 0) equity += pnl[m].netIncome;
    equity = ov('equity', m) ?? equity;

    const otherNoncurrentAssets = ov('otherNoncurrentAssets', m) ?? rf * base.otherNoncurrentAssets;
    const financialInvestmentsLp = ov('financialInvestmentsLp', m) ?? rf * base.financialInvestmentsLp;

    const inventory = ov('inventory', m) ?? cf * base.inventory;
    const accountsReceivable = ov('accountsReceivable', m) ?? rf * base.accountsReceivable;
    const taxReceivables = ov('taxReceivables', m) ?? rf * base.taxReceivables;
    const cashEquivalents = ov('cashEquivalents', m) ?? rf * base.cashEquivalents;
    const totalCurrentAssets = inventory + accountsReceivable + taxReceivables + cashEquivalents;

    const provisionsLp = ov('provisionsLp', m) ?? rf * base.provisionsLp;
    const bankDebtLp = ov('bankDebtLp', m) ?? rf * base.bankDebtLp;
    const otherLiabilitiesLp = ov('otherLiabilitiesLp', m) ?? rf * base.otherLiabilitiesLp;
    const totalNoncurrentLiabilities = provisionsLp + bankDebtLp + otherLiabilitiesLp;

    const provisionsSp = ov('provisionsSp', m) ?? rf * base.provisionsSp;
    const bankDebtSp = ov('bankDebtSp', m) ?? rf * base.bankDebtSp;
    const accountsPayable = ov('accountsPayable', m) ?? cf * base.accountsPayable;
    const taxLiabilities = ov('taxLiabilities', m) ?? rf * base.taxLiabilities;
    const otherLiabilitiesSp = ov('otherLiabilitiesSp', m) ?? rf * base.otherLiabilitiesSp;
    const totalCurrentLiabilities =
      provisionsSp + bankDebtSp + accountsPayable + taxLiabilities + otherLiabilitiesSp;

    const totalEquityAndLiabilities = equity + totalNoncurrentLiabilities + totalCurrentLiabilities;

    // Balancing plug ("CUADRATURA"): absorbed into Activo Fijo so the sheet always squares,
    // unless the user overrode Activo Fijo directly — then the sheet may show a non-zero
    // "Descuadratura" row, same as manually editing the Excel cell would.
    const fixedAssetsOverride = ov('fixedAssets', m);
    let fixedAssets: number;
    if (fixedAssetsOverride !== null) {
      fixedAssets = fixedAssetsOverride;
    } else {
      const fixedAssetsUnplugged = rf * base.fixedAssets;
      const totalAssetsUnplugged =
        fixedAssetsUnplugged + otherNoncurrentAssets + financialInvestmentsLp + totalCurrentAssets;
      const plug = totalEquityAndLiabilities - totalAssetsUnplugged;
      fixedAssets = fixedAssetsUnplugged + plug;
    }

    const totalNoncurrentAssets = fixedAssets + otherNoncurrentAssets + financialInvestmentsLp;
    const totalAssets = totalNoncurrentAssets + totalCurrentAssets;
    const imbalance = totalEquityAndLiabilities - totalAssets; // ~0 unless overridden

    rows.push({
      fixedAssets, otherNoncurrentAssets, financialInvestmentsLp, totalNoncurrentAssets,
      inventory, accountsReceivable, taxReceivables, cashEquivalents, totalCurrentAssets,
      totalAssets, equity,
      provisionsLp, bankDebtLp, otherLiabilitiesLp, totalNoncurrentLiabilities,
      provisionsSp, bankDebtSp, accountsPayable, taxLiabilities, otherLiabilitiesSp,
      totalCurrentLiabilities, totalEquityAndLiabilities, imbalance,
    });
  }

  return rows;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const monthlyForecastService = {
  async getOrInit(companyId: string, year: number) {
    return prisma.monthlyForecast.findUnique({ where: { companyId_year: { companyId, year } } });
  },

  async save(companyId: string, year: number, data: {
    closedMonths?: number;
    actualRevenue?: number[];
    actualCostOfSales?: number[];
    actualAdminExpenses?: number[];
    actualExceptionalIncome?: number[];
    actualExceptionalExpenses?: number[];
    actualFinancialIncome?: number[];
    actualFinancialExpenses?: number[];
    actualIncomeTax?: number[];
    rateRevenue?: number[];
    rateCostOfSales?: number[];
    rateAdminExpenses?: number[];
    rateExceptionalIncome?: number[];
    rateExceptionalExpenses?: number[];
    rateFinancialIncome?: number[];
    rateFinancialExpenses?: number[];
    rateIncomeTax?: number[];
    balanceOverrides?: BalanceOverrides;
  }) {
    return prisma.monthlyForecast.upsert({
      where: { companyId_year: { companyId, year } },
      update: { ...data, updatedAt: new Date() },
      create: { companyId, year, ...data },
    });
  },

  async calculate(companyId: string, userId: string, year: number): Promise<MonthlyForecastResult> {
    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: { id: companyId, userId, deletedAt: null },
    });
    if (!company) throw new Error('Empresa no encontrada');

    // Load base annual data: most recent year ≤ forecastYear that has both statements.
    // For a 2026 forecast the ideal base is 2025; falls back to whatever is newest available.
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        companyId,
        year: { lte: year },
        quarter: 0,
        month: 0,
        incomeStatement: { isNot: null },
        balanceSheet:    { isNot: null },
      },
      include: { incomeStatement: true, balanceSheet: true },
      orderBy: { year: 'desc' },
    });
    if (!fiscalYear) {
      throw new Error(
        'No hay datos financieros anuales disponibles. Introduce primero los datos anuales de la empresa.',
      );
    }

    const annualPnL = buildAnnualPnL(fiscalYear.incomeStatement);
    const annualBalance = buildAnnualBalance(fiscalYear.balanceSheet);

    // Load stored forecast config
    const stored = await prisma.monthlyForecast.findUnique({
      where: { companyId_year: { companyId, year } },
    });

    const closedMonths = stored?.closedMonths ?? 0;

    const actual: Record<keyof AnnualPnL, number[]> = {
      revenue: jsonToArray(stored?.actualRevenue),
      costOfSales: jsonToArray(stored?.actualCostOfSales),
      adminExpenses: jsonToArray(stored?.actualAdminExpenses),
      exceptionalIncome: jsonToArray(stored?.actualExceptionalIncome),
      exceptionalExpenses: jsonToArray(stored?.actualExceptionalExpenses),
      financialIncome: jsonToArray(stored?.actualFinancialIncome),
      financialExpenses: jsonToArray(stored?.actualFinancialExpenses),
      incomeTax: jsonToArray(stored?.actualIncomeTax),
    };

    const rates: Record<keyof AnnualPnL, number[]> = {
      revenue: jsonToArray(stored?.rateRevenue, 0),
      costOfSales: jsonToArray(stored?.rateCostOfSales, 0),
      adminExpenses: jsonToArray(stored?.rateAdminExpenses, 0),
      exceptionalIncome: jsonToArray(stored?.rateExceptionalIncome, 0),
      exceptionalExpenses: jsonToArray(stored?.rateExceptionalExpenses, 0),
      financialIncome: jsonToArray(stored?.rateFinancialIncome, 0),
      financialExpenses: jsonToArray(stored?.rateFinancialExpenses, 0),
      incomeTax: jsonToArray(stored?.rateIncomeTax, 0),
    };

    const balanceOverrides = normalizeBalanceOverrides(stored?.balanceOverrides);

    const pnl = calcMonthlyPnL(annualPnL, closedMonths, actual, rates);
    const balance = calcMonthlyBalance(
      annualBalance, annualPnL.revenue, annualPnL.costOfSales, pnl, balanceOverrides,
    );

    return { pnl, balance, annualPnL, annualBalance, baseYear: fiscalYear.year };
  },
};
