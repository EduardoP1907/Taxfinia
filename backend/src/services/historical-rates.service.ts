/**
 * Tasas recomendadas a partir de "Datos anuales".
 *
 * Calcula, por concepto, el promedio del crecimiento interanual de los
 * últimos 3 años. Alimenta los valores iniciales (editables) de la Hoja 4.0
 * y de las tasas mensuales de Forecast / Budget. Todas las tasas en decimal
 * (0.05 = 5%); null cuando no hay datos suficientes para calcularla.
 */

import prisma from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import {
  averageHistoricalGrowth,
  averageEffectiveTaxRate,
  type YearValue,
} from '../utils/historical-growth';

function toNumber(value: Decimal | null | undefined): number {
  if (!value) return 0;
  return parseFloat(value.toString());
}

// Conceptos de la Hoja 4.0 (mismas definiciones que createBaseYearProjection)
export interface AnnualSuggestedRates {
  revenueGrowthRate: number | null;
  costOfSalesGrowthRate: number | null;
  otherOperatingExpensesGrowthRate: number | null;
  depreciationGrowthRate: number | null;
  exceptionalNetGrowthRate: number | null;
  financialNetGrowthRate: number | null;
  totalAssetsGrowthRate: number | null;
  equityGrowthRate: number | null;
  totalLiabilitiesGrowthRate: number | null;
  taxRate: number | null;
}

// Conceptos del P&G mensual (mismas definiciones que buildAnnualPnL del forecast)
export interface MonthlySuggestedRates {
  revenue: number | null;
  costOfSales: number | null;
  adminExpenses: number | null;
  exceptionalIncome: number | null;
  exceptionalExpenses: number | null;
  financialIncome: number | null;
  financialExpenses: number | null;
  incomeTax: number | null;
}

export interface HistoricalRates {
  yearsUsed: number[];
  annual: AnnualSuggestedRates;
  monthly: MonthlySuggestedRates;
}

/**
 * @param upToYear último año (inclusive) a considerar; sin él, usa todos.
 */
export async function getHistoricalRates(companyId: string, upToYear?: number): Promise<HistoricalRates> {
  const fiscalYears = await prisma.fiscalYear.findMany({
    where: {
      companyId,
      quarter: 0,
      month: 0,
      ...(upToYear !== undefined ? { year: { lte: upToYear } } : {}),
      incomeStatement: { isNot: null },
      balanceSheet: { isNot: null },
    },
    include: { incomeStatement: true, balanceSheet: true },
    orderBy: { year: 'asc' },
  });

  const rows = fiscalYears.map(fy => {
    const is = fy.incomeStatement!;
    const bs = fy.balanceSheet!;
    const revenue = toNumber(is.revenue);
    const costOfSales = toNumber(is.costOfSales);
    const staffCostsSales = toNumber(is.staffCostsSales);
    const adminExpenses = toNumber(is.adminExpenses) + toNumber(is.staffCostsAdmin);
    const depreciation = toNumber(is.depreciation);
    const exceptionalIncome = toNumber(is.exceptionalIncome);
    const exceptionalExpenses = toNumber(is.exceptionalExpenses);
    const financialIncome = toNumber(is.financialIncome);
    const financialExpenses = toNumber(is.financialExpenses);
    const incomeTax = toNumber(is.incomeTax);

    // Sheet 2.1: EBT = Ventas − Coste ventas − Gastos explotación − Amortizaciones
    //                  + Excepcional neto + Financiero neto
    const ebt =
      revenue - costOfSales - staffCostsSales - adminExpenses - depreciation +
      (exceptionalIncome - exceptionalExpenses) + (financialIncome - financialExpenses);

    const totalAssets =
      toNumber(bs.tangibleAssets) + toNumber(bs.intangibleAssets) +
      toNumber(bs.financialInvestmentsLp) + toNumber(bs.otherNoncurrentAssets) +
      toNumber(bs.inventory) + toNumber(bs.accountsReceivable) +
      toNumber(bs.otherReceivables) + toNumber(bs.taxReceivables) +
      toNumber(bs.cashEquivalents);
    const equity =
      toNumber(bs.shareCapital) + toNumber(bs.reserves) +
      toNumber(bs.retainedEarnings) - toNumber(bs.treasuryStock);
    const totalLiabilities =
      toNumber(bs.provisionsLp) + toNumber(bs.bankDebtLp) + toNumber(bs.otherLiabilitiesLp) +
      toNumber(bs.provisionsSp) + toNumber(bs.bankDebtSp) + toNumber(bs.accountsPayable) +
      toNumber(bs.taxLiabilities) + toNumber(bs.otherLiabilitiesSp);

    return {
      year: fy.year,
      revenue,
      costOfSales,
      staffCostsSales,
      adminExpenses,
      depreciation,
      exceptionalIncome,
      exceptionalExpenses,
      financialIncome,
      financialExpenses,
      incomeTax,
      ebt,
      totalAssets,
      equity,
      totalLiabilities,
    };
  });

  const growth = (pick: (r: typeof rows[number]) => number) =>
    averageHistoricalGrowth(rows.map<YearValue>(r => ({ year: r.year, value: pick(r) })));

  return {
    yearsUsed: rows.slice(-4).map(r => r.year),
    annual: {
      revenueGrowthRate: growth(r => r.revenue),
      costOfSalesGrowthRate: growth(r => r.costOfSales),
      otherOperatingExpensesGrowthRate: growth(r => r.adminExpenses),
      depreciationGrowthRate: growth(r => r.depreciation),
      exceptionalNetGrowthRate: growth(r => r.exceptionalIncome - r.exceptionalExpenses),
      financialNetGrowthRate: growth(r => r.financialIncome - r.financialExpenses),
      totalAssetsGrowthRate: growth(r => r.totalAssets),
      equityGrowthRate: growth(r => r.equity),
      totalLiabilitiesGrowthRate: growth(r => r.totalLiabilities),
      taxRate: averageEffectiveTaxRate(rows),
    },
    monthly: {
      revenue: growth(r => r.revenue),
      costOfSales: growth(r => r.costOfSales + r.staffCostsSales),
      adminExpenses: growth(r => r.adminExpenses + r.depreciation),
      exceptionalIncome: growth(r => r.exceptionalIncome),
      exceptionalExpenses: growth(r => r.exceptionalExpenses),
      financialIncome: growth(r => r.financialIncome),
      financialExpenses: growth(r => r.financialExpenses),
      incomeTax: growth(r => r.incomeTax),
    },
  };
}
