import { PrismaClient } from '@prisma/client';
import type { MonthlySuggestedRates } from './historical-rates.service';

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
  accountsReceivable: number;
  otherReceivables: number;
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
  otherReceivables: number;
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
  // Budget only: the prior-year Forecast months each Budget month grows over
  basePnL?: MonthlyPnLRow[];
  // Recommended monthly rates (avg growth of the last 3 annual years), decimal;
  // used as the initial value of every month when no rates were saved yet
  suggestedRates: MonthlySuggestedRates;
}

// Leaf balance line items the user can manually override (excludes computed
// totals/subtotals and the "imbalance" check row, which are always derived).
export const BALANCE_OVERRIDE_KEYS = [
  'fixedAssets', 'otherNoncurrentAssets', 'financialInvestmentsLp',
  'inventory', 'accountsReceivable', 'otherReceivables', 'taxReceivables', 'cashEquivalents',
  'equity', 'provisionsLp', 'bankDebtLp', 'otherLiabilitiesLp',
  'provisionsSp', 'bankDebtSp', 'accountsPayable', 'taxLiabilities', 'otherLiabilitiesSp',
] as const;

export type BalanceOverrideKey = typeof BALANCE_OVERRIDE_KEYS[number];

// { [fieldKey]: (number|null)[12] } — null means "use the calculated value".
export type BalanceOverrides = Partial<Record<BalanceOverrideKey, (number | null)[]>>;

// Tasas por defecto de Forecast y Budget (decimal), usadas en cada mes de las
// filas cuyas tasas nunca se guardaron. incomeTax NO es una tasa de crecimiento:
// es el % que se aplica sobre el Resultado antes de impuestos del mismo mes.
export const DEFAULT_MONTHLY_RATES: MonthlySuggestedRates = {
  revenue: 0.045,
  costOfSales: 0.04,
  adminExpenses: 0.02,
  exceptionalIncome: 0.02,
  exceptionalExpenses: 0.02,
  financialIncome: 0.02,
  financialExpenses: 0.02,
  incomeTax: 0.25,
};

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
    accountsReceivable: toNum(bs.accountsReceivable),
    otherReceivables: toNum(bs.otherReceivables),
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
// Forecast — matches FCASTPPGG2026 logic:
//   Month 0 (Jan, projected) = base / 12
//   Month N (projected)      = prev * (1 + rate[N])
//   Closed months            = actual values entered by user
// Budget — when `monthlyBase` (the prior-year Forecast months) is given, every
// month grows over the SAME month of the Forecast:
//   Month N = forecast[N] * (1 + rate[N])
// Impuestos (meses proyectados, en ambos modos) = EBT del mismo mes × tasa[N]

function calcMonthlyPnL(
  base: AnnualPnL,
  closedMonths: number,
  actual: Record<keyof AnnualPnL, number[]>,
  rates: Record<keyof AnnualPnL, number[]>,
  monthlyBase?: MonthlyPnLRow[],
): MonthlyPnLRow[] {
  const rows: MonthlyPnLRow[] = [];

  for (let m = 0; m < 12; m++) {
    const isClosed = m < closedMonths;
    let revenue: number, costOfSales: number, adminExpenses: number;
    let exceptionalIncome: number, exceptionalExpenses: number;
    let financialIncome: number, financialExpenses: number;
    let incomeTax: number | null = null;

    if (monthlyBase && !isClosed) {
      const b = monthlyBase[m];
      revenue = b.revenue * (1 + rates.revenue[m]);
      costOfSales = b.costOfSales * (1 + rates.costOfSales[m]);
      adminExpenses = b.adminExpenses * (1 + rates.adminExpenses[m]);
      exceptionalIncome = b.exceptionalIncome * (1 + rates.exceptionalIncome[m]);
      exceptionalExpenses = b.exceptionalExpenses * (1 + rates.exceptionalExpenses[m]);
      financialIncome = b.financialIncome * (1 + rates.financialIncome[m]);
      financialExpenses = b.financialExpenses * (1 + rates.financialExpenses[m]);
    } else if (isClosed) {
      revenue = actual.revenue[m];
      costOfSales = actual.costOfSales[m];
      adminExpenses = actual.adminExpenses[m];
      exceptionalIncome = actual.exceptionalIncome[m];
      exceptionalExpenses = actual.exceptionalExpenses[m];
      financialIncome = actual.financialIncome[m];
      financialExpenses = actual.financialExpenses[m];
      incomeTax = actual.incomeTax[m];
    } else if (m === 0) {
      // First projected month: base / 12 (matches Excel FCASTPPGG row 4 January formula),
      // with January's own editable growth rate applied over that annual-average base.
      const jf = (r: number[]) => 1 + (r[0] ?? 0);
      revenue = (base.revenue / 12) * jf(rates.revenue);
      costOfSales = (base.costOfSales / 12) * jf(rates.costOfSales);
      adminExpenses = (base.adminExpenses / 12) * jf(rates.adminExpenses);
      exceptionalIncome = (base.exceptionalIncome / 12) * jf(rates.exceptionalIncome);
      exceptionalExpenses = (base.exceptionalExpenses / 12) * jf(rates.exceptionalExpenses);
      financialIncome = (base.financialIncome / 12) * jf(rates.financialIncome);
      financialExpenses = (base.financialExpenses / 12) * jf(rates.financialExpenses);
    } else {
      const prev = rows[m - 1];
      revenue = prev.revenue * (1 + rates.revenue[m]);
      costOfSales = prev.costOfSales * (1 + rates.costOfSales[m]);
      adminExpenses = prev.adminExpenses * (1 + rates.adminExpenses[m]);
      exceptionalIncome = prev.exceptionalIncome * (1 + rates.exceptionalIncome[m]);
      exceptionalExpenses = prev.exceptionalExpenses * (1 + rates.exceptionalExpenses[m]);
      financialIncome = prev.financialIncome * (1 + rates.financialIncome[m]);
      financialExpenses = prev.financialExpenses * (1 + rates.financialExpenses[m]);
    }

    const grossMargin = revenue - costOfSales;
    const operatingResult = grossMargin - adminExpenses;
    const exceptionalResult = exceptionalIncome - exceptionalExpenses;
    const financialResult = financialIncome - financialExpenses;
    const ebt = operatingResult + exceptionalResult + financialResult;
    // Meses proyectados: el impuesto es la tasa de la fila de Impuestos aplicada
    // directamente sobre el Resultado antes de impuestos del mismo mes.
    if (incomeTax === null) incomeTax = ebt * rates.incomeTax[m];
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
//   fixedAssets_N = factor*base
//   cash_N = factor*base + plug_N, where plug_N = TotalPasivoYPN_N - TotalActivoSinPlug_N
//     (la cuadratura C31 del Excel va a Disponible en vez de a Activo Fijo)

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
    const otherReceivables = ov('otherReceivables', m) ?? rf * base.otherReceivables;
    const taxReceivables = ov('taxReceivables', m) ?? rf * base.taxReceivables;
    const cashOverride = ov('cashEquivalents', m);

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

    const fixedAssets = ov('fixedAssets', m) ?? rf * base.fixedAssets;
    const totalNoncurrentAssets = fixedAssets + otherNoncurrentAssets + financialInvestmentsLp;

    // Balancing plug ("Descuadratura") absorbed into Disponible (tesorería) so
    // Activo = Pasivo + PN every month, unless the user overrode Disponible —
    // then the "Descuadratura" row may show a non-zero value.
    let cashEquivalents: number;
    if (cashOverride !== null) {
      cashEquivalents = cashOverride;
    } else {
      const cashUnplugged = rf * base.cashEquivalents;
      const totalAssetsUnplugged =
        totalNoncurrentAssets + inventory + accountsReceivable + otherReceivables + taxReceivables + cashUnplugged;
      cashEquivalents = cashUnplugged + (totalEquityAndLiabilities - totalAssetsUnplugged);
    }
    const totalCurrentAssets = inventory + accountsReceivable + otherReceivables + taxReceivables + cashEquivalents;

    const totalAssets = totalNoncurrentAssets + totalCurrentAssets;
    const imbalance = totalEquityAndLiabilities - totalAssets; // ~0 unless overridden

    rows.push({
      fixedAssets, otherNoncurrentAssets, financialInvestmentsLp, totalNoncurrentAssets,
      inventory, accountsReceivable, otherReceivables, taxReceivables, cashEquivalents, totalCurrentAssets,
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

  async calculate(
    companyId: string,
    userId: string,
    year: number,
    opts: { mode?: 'forecast' | 'budget' } = {},
  ): Promise<MonthlyForecastResult> {
    const mode = opts.mode ?? 'forecast';

    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: { id: companyId, userId, deletedAt: null },
    });
    if (!company) throw new Error('Empresa no encontrada');

    let annualPnL: AnnualPnL;
    let annualBalance: AnnualBalance;
    let baseYear: number;
    let basePnL: MonthlyPnLRow[] | undefined;

    if (mode === 'budget') {
      // Budget bases itself on this company's own Forecast for the prior year
      // (its target year minus 1) — the Forecast already blends real closed
      // months with projected ones into a full-year figure. Budget never reads
      // the stored annual FiscalYear data directly.
      const forecastYear = year - 1;
      let forecastResult: MonthlyForecastResult;
      try {
        forecastResult = await monthlyForecastService.calculate(companyId, userId, forecastYear, { mode: 'forecast' });
      } catch {
        throw new Error(
          `No hay datos de Forecast ${forecastYear} disponibles. Completa primero el Forecast ${forecastYear} para poder generar el Budget ${year}.`,
        );
      }

      annualPnL = forecastResult.pnl.reduce<AnnualPnL>(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          costOfSales: acc.costOfSales + row.costOfSales,
          adminExpenses: acc.adminExpenses + row.adminExpenses,
          exceptionalIncome: acc.exceptionalIncome + row.exceptionalIncome,
          exceptionalExpenses: acc.exceptionalExpenses + row.exceptionalExpenses,
          financialIncome: acc.financialIncome + row.financialIncome,
          financialExpenses: acc.financialExpenses + row.financialExpenses,
          incomeTax: acc.incomeTax + row.incomeTax,
        }),
        {
          revenue: 0, costOfSales: 0, adminExpenses: 0,
          exceptionalIncome: 0, exceptionalExpenses: 0,
          financialIncome: 0, financialExpenses: 0, incomeTax: 0,
        },
      );

      const dec = forecastResult.balance[11];
      annualBalance = {
        fixedAssets: dec.fixedAssets,
        otherNoncurrentAssets: dec.otherNoncurrentAssets,
        financialInvestmentsLp: dec.financialInvestmentsLp,
        accountsReceivable: dec.accountsReceivable,
        otherReceivables: dec.otherReceivables,
        taxReceivables: dec.taxReceivables,
        cashEquivalents: dec.cashEquivalents,
        inventory: dec.inventory,
        equity: dec.equity,
        provisionsLp: dec.provisionsLp,
        bankDebtLp: dec.bankDebtLp,
        otherLiabilitiesLp: dec.otherLiabilitiesLp,
        provisionsSp: dec.provisionsSp,
        bankDebtSp: dec.bankDebtSp,
        accountsPayable: dec.accountsPayable,
        taxLiabilities: dec.taxLiabilities,
        otherLiabilitiesSp: dec.otherLiabilitiesSp,
      };
      baseYear = forecastYear;
      basePnL = forecastResult.pnl;
    } else {
      // Load base annual data: most recent year BEFORE the forecast year that has
      // both statements (a 2026 forecast is based on 2025, never on an annual
      // 2026 record). Only if no prior year exists, fall back to the year itself.
      const findBase = (yearFilter: { lt: number } | { lte: number }) =>
        prisma.fiscalYear.findFirst({
          where: {
            companyId,
            year: yearFilter,
            quarter: 0,
            month: 0,
            incomeStatement: { isNot: null },
            balanceSheet:    { isNot: null },
          },
          include: { incomeStatement: true, balanceSheet: true },
          orderBy: { year: 'desc' },
        });
      const fiscalYear = (await findBase({ lt: year })) ?? (await findBase({ lte: year }));
      if (!fiscalYear) {
        throw new Error(
          'No hay datos financieros anuales disponibles. Introduce primero los datos anuales de la empresa.',
        );
      }

      annualPnL = buildAnnualPnL(fiscalYear.incomeStatement);
      annualBalance = buildAnnualBalance(fiscalYear.balanceSheet);
      baseYear = fiscalYear.year;
    }

    // Load stored forecast/budget config for the requested year
    const stored = await prisma.monthlyForecast.findUnique({
      where: { companyId_year: { companyId, year } },
    });

    // Budget has no "closed months" concept — every month is rate-driven from
    // the Forecast base above, and only the growth-rate cells are editable.
    const closedMonths = mode === 'budget' ? 0 : (stored?.closedMonths ?? 0);

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

    // Default rates for every month of any concept whose rates were never
    // saved; saved rates (even 0%) always win.
    const suggestedRates = DEFAULT_MONTHLY_RATES;
    const rateArray = (json: any, suggested: number | null) =>
      Array.isArray(json) ? jsonToArray(json, 0) : Array(12).fill(suggested ?? 0);

    const rates: Record<keyof AnnualPnL, number[]> = {
      revenue: rateArray(stored?.rateRevenue, suggestedRates.revenue),
      costOfSales: rateArray(stored?.rateCostOfSales, suggestedRates.costOfSales),
      adminExpenses: rateArray(stored?.rateAdminExpenses, suggestedRates.adminExpenses),
      exceptionalIncome: rateArray(stored?.rateExceptionalIncome, suggestedRates.exceptionalIncome),
      exceptionalExpenses: rateArray(stored?.rateExceptionalExpenses, suggestedRates.exceptionalExpenses),
      financialIncome: rateArray(stored?.rateFinancialIncome, suggestedRates.financialIncome),
      financialExpenses: rateArray(stored?.rateFinancialExpenses, suggestedRates.financialExpenses),
      incomeTax: rateArray(stored?.rateIncomeTax, suggestedRates.incomeTax),
    };

    // Budget rows are never manually overridden — only their growth rates are editable.
    const balanceOverrides = mode === 'budget' ? {} : normalizeBalanceOverrides(stored?.balanceOverrides);

    const pnl = calcMonthlyPnL(annualPnL, closedMonths, actual, rates, basePnL);
    const balance = calcMonthlyBalance(
      annualBalance, annualPnL.revenue, annualPnL.costOfSales, pnl, balanceOverrides,
    );

    return { pnl, balance, annualPnL, annualBalance, baseYear, basePnL, suggestedRates };
  },
};
