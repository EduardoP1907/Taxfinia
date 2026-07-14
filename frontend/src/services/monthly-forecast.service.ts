import api from './api';

export interface MonthlyForecastConfig {
  closedMonths: number;
  actualRevenue: number[];
  actualCostOfSales: number[];
  actualAdminExpenses: number[];
  actualExceptionalIncome: number[];
  actualExceptionalExpenses: number[];
  actualFinancialIncome: number[];
  actualFinancialExpenses: number[];
  actualIncomeTax: number[];
  rateRevenue: number[];
  rateCostOfSales: number[];
  rateAdminExpenses: number[];
  rateExceptionalIncome: number[];
  rateExceptionalExpenses: number[];
  rateFinancialIncome: number[];
  rateFinancialExpenses: number[];
  rateIncomeTax: number[];
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
  pnl: MonthlyPnLRow[];
  balance: MonthlyBalanceRow[];
  annualPnL: {
    revenue: number; costOfSales: number; adminExpenses: number;
    exceptionalIncome: number; exceptionalExpenses: number;
    financialIncome: number; financialExpenses: number; incomeTax: number;
  };
  annualBalance: Record<string, number>;
  baseYear: number;
}

export const monthlyForecastService = {
  async get(companyId: string, year: number): Promise<MonthlyForecastConfig | null> {
    try {
      const res = await api.get(`/monthly-forecast/${companyId}/${year}`);
      return res.data.data;
    } catch {
      return null;
    }
  },

  async save(companyId: string, year: number, data: Partial<MonthlyForecastConfig>): Promise<MonthlyForecastConfig> {
    const res = await api.put(`/monthly-forecast/${companyId}/${year}`, data);
    return res.data.data;
  },

  async calculate(companyId: string, year: number): Promise<MonthlyForecastResult> {
    const res = await api.get(`/monthly-forecast/${companyId}/${year}/calculate`);
    return res.data.data;
  },
};

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ─── Client-side P&G calculation (mirrors backend calcMonthlyPnL) ─────────────
// Lets the page show live updates as the user types rates / actual values,
// without waiting for the server.

export interface AnnualPnLBase {
  revenue: number; costOfSales: number; adminExpenses: number;
  exceptionalIncome: number; exceptionalExpenses: number;
  financialIncome: number; financialExpenses: number; incomeTax: number;
}

export function calcPnLClient(
  cfg: MonthlyForecastConfig,
  base: AnnualPnLBase,
): MonthlyPnLRow[] {
  const rows: MonthlyPnLRow[] = [];
  const { closedMonths } = cfg;

  for (let m = 0; m < 12; m++) {
    const isClosed = m < closedMonths;

    let revenue: number, costOfSales: number, adminExpenses: number;
    let exceptionalIncome: number, exceptionalExpenses: number;
    let financialIncome: number, financialExpenses: number, incomeTax: number;

    if (isClosed) {
      revenue            = cfg.actualRevenue[m]            ?? 0;
      costOfSales        = cfg.actualCostOfSales[m]        ?? 0;
      adminExpenses      = cfg.actualAdminExpenses[m]      ?? 0;
      exceptionalIncome  = cfg.actualExceptionalIncome[m]  ?? 0;
      exceptionalExpenses= cfg.actualExceptionalExpenses[m]?? 0;
      financialIncome    = cfg.actualFinancialIncome[m]    ?? 0;
      financialExpenses  = cfg.actualFinancialExpenses[m]  ?? 0;
      incomeTax          = cfg.actualIncomeTax[m]          ?? 0;
    } else if (m === 0) {
      revenue            = base.revenue            / 12;
      costOfSales        = base.costOfSales        / 12;
      adminExpenses      = base.adminExpenses      / 12;
      exceptionalIncome  = base.exceptionalIncome  / 12;
      exceptionalExpenses= base.exceptionalExpenses/ 12;
      financialIncome    = base.financialIncome    / 12;
      financialExpenses  = base.financialExpenses  / 12;
      incomeTax          = base.incomeTax          / 12;
    } else {
      const prev = rows[m - 1];
      revenue            = prev.revenue            * (1 + (cfg.rateRevenue[m]            ?? 0));
      costOfSales        = prev.costOfSales        * (1 + (cfg.rateCostOfSales[m]        ?? 0));
      adminExpenses      = prev.adminExpenses      * (1 + (cfg.rateAdminExpenses[m]      ?? 0));
      exceptionalIncome  = prev.exceptionalIncome  * (1 + (cfg.rateExceptionalIncome[m]  ?? 0));
      exceptionalExpenses= prev.exceptionalExpenses* (1 + (cfg.rateExceptionalExpenses[m]?? 0));
      financialIncome    = prev.financialIncome    * (1 + (cfg.rateFinancialIncome[m]    ?? 0));
      financialExpenses  = prev.financialExpenses  * (1 + (cfg.rateFinancialExpenses[m]  ?? 0));
      incomeTax          = prev.incomeTax          * (1 + (cfg.rateIncomeTax[m]          ?? 0));
    }

    const grossMargin       = revenue - costOfSales;
    const operatingResult   = grossMargin - adminExpenses;
    const exceptionalResult = exceptionalIncome - exceptionalExpenses;
    const financialResult   = financialIncome - financialExpenses;
    const ebt               = operatingResult + exceptionalResult + financialResult;
    const netIncome         = ebt - incomeTax;

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

export function defaultRates(): number[] {
  return Array(12).fill(0.04);
}

export function defaultActuals(): number[] {
  return Array(12).fill(0);
}

export function buildDefaultConfig(): MonthlyForecastConfig {
  return {
    closedMonths: 0,
    actualRevenue: defaultActuals(),
    actualCostOfSales: defaultActuals(),
    actualAdminExpenses: defaultActuals(),
    actualExceptionalIncome: defaultActuals(),
    actualExceptionalExpenses: defaultActuals(),
    actualFinancialIncome: defaultActuals(),
    actualFinancialExpenses: defaultActuals(),
    actualIncomeTax: defaultActuals(),
    rateRevenue: defaultRates(),
    rateCostOfSales: defaultRates(),
    rateAdminExpenses: defaultRates(),
    rateExceptionalIncome: defaultRates(),
    rateExceptionalExpenses: defaultRates(),
    rateFinancialIncome: defaultRates(),
    rateFinancialExpenses: defaultRates(),
    rateIncomeTax: defaultRates(),
  };
}

export function mergeConfig(stored: any | null): MonthlyForecastConfig {
  const def = buildDefaultConfig();
  if (!stored) return def;
  const arr = (v: any, fallback: number[]) =>
    Array.isArray(v) && v.length === 12 ? v : fallback;
  return {
    closedMonths: stored.closedMonths ?? 0,
    actualRevenue: arr(stored.actualRevenue, def.actualRevenue),
    actualCostOfSales: arr(stored.actualCostOfSales, def.actualCostOfSales),
    actualAdminExpenses: arr(stored.actualAdminExpenses, def.actualAdminExpenses),
    actualExceptionalIncome: arr(stored.actualExceptionalIncome, def.actualExceptionalIncome),
    actualExceptionalExpenses: arr(stored.actualExceptionalExpenses, def.actualExceptionalExpenses),
    actualFinancialIncome: arr(stored.actualFinancialIncome, def.actualFinancialIncome),
    actualFinancialExpenses: arr(stored.actualFinancialExpenses, def.actualFinancialExpenses),
    actualIncomeTax: arr(stored.actualIncomeTax, def.actualIncomeTax),
    rateRevenue: arr(stored.rateRevenue, def.rateRevenue),
    rateCostOfSales: arr(stored.rateCostOfSales, def.rateCostOfSales),
    rateAdminExpenses: arr(stored.rateAdminExpenses, def.rateAdminExpenses),
    rateExceptionalIncome: arr(stored.rateExceptionalIncome, def.rateExceptionalIncome),
    rateExceptionalExpenses: arr(stored.rateExceptionalExpenses, def.rateExceptionalExpenses),
    rateFinancialIncome: arr(stored.rateFinancialIncome, def.rateFinancialIncome),
    rateFinancialExpenses: arr(stored.rateFinancialExpenses, def.rateFinancialExpenses),
    rateIncomeTax: arr(stored.rateIncomeTax, def.rateIncomeTax),
  };
}
