/**
 * Ratios Service
 * Calculates all financial ratios and analysis for a given fiscal year
 */

import prisma from '../config/database';
import * as ratios from '../utils/ratios';
import { Decimal } from '@prisma/client/runtime/library';

// Helper to convert Prisma Decimal to number
function toNumber(value: Decimal | null | undefined): number {
  if (!value) return 0;
  return parseFloat(value.toString());
}

export class RatiosService {
  /**
   * Calculate all ratios for a fiscal year
   */
  async calculateRatiosForYear(fiscalYearId: string) {
    console.log('========================================');
    console.log('[RATIOS] CALCULATING RATIOS FOR FISCAL YEAR:', fiscalYearId);
    console.log('========================================');

    // Fetch all required data
    const fiscalYear = await prisma.fiscalYear.findUnique({
      where: { id: fiscalYearId },
      include: {
        balanceSheet: true,
        incomeStatement: true,
        cashFlow: true,
        additionalData: true,
        company: true,
      },
    });

    if (!fiscalYear) {
      throw new Error('Fiscal year not found');
    }

    const { balanceSheet: bs, incomeStatement: is } = fiscalYear;

    if (!bs || !is) {
      throw new Error('Missing required financial statements (Balance Sheet or Income Statement)');
    }

    // Convert Prisma Decimals to numbers for calculations
    const balanceData: ratios.BalanceSheetData = {
      tangibleAssets: toNumber(bs.tangibleAssets),
      intangibleAssets: toNumber(bs.intangibleAssets),
      financialInvestmentsLp: toNumber(bs.financialInvestmentsLp),
      otherNoncurrentAssets: toNumber(bs.otherNoncurrentAssets),
      inventory: toNumber(bs.inventory),
      accountsReceivable: toNumber(bs.accountsReceivable),
      otherReceivables: toNumber(bs.otherReceivables),
      taxReceivables: toNumber(bs.taxReceivables),
      cashEquivalents: toNumber(bs.cashEquivalents),
      shareCapital: toNumber(bs.shareCapital),
      reserves: toNumber(bs.reserves),
      retainedEarnings: toNumber(bs.retainedEarnings),
      treasuryStock: toNumber(bs.treasuryStock),
      provisionsLp: toNumber(bs.provisionsLp),
      bankDebtLp: toNumber(bs.bankDebtLp),
      otherLiabilitiesLp: toNumber(bs.otherLiabilitiesLp),
      provisionsSp: toNumber(bs.provisionsSp),
      bankDebtSp: toNumber(bs.bankDebtSp),
      accountsPayable: toNumber(bs.accountsPayable),
      taxLiabilities: toNumber(bs.taxLiabilities),
      otherLiabilitiesSp: toNumber(bs.otherLiabilitiesSp),
    };

    console.log('[RATIOS] Balance Data:', JSON.stringify(balanceData, null, 2));

    const incomeData: ratios.IncomeStatementData = {
      revenue: toNumber(is.revenue),
      otherOperatingIncome: toNumber(is.otherOperatingIncome),
      costOfSales: toNumber(is.costOfSales),
      staffCostsSales: toNumber(is.staffCostsSales),
      adminExpenses: toNumber(is.adminExpenses),
      staffCostsAdmin: toNumber(is.staffCostsAdmin),
      depreciation: toNumber(is.depreciation),
      exceptionalIncome: toNumber(is.exceptionalIncome),
      exceptionalExpenses: toNumber(is.exceptionalExpenses),
      financialIncome: toNumber(is.financialIncome),
      financialExpenses: toNumber(is.financialExpenses),
      incomeTax: toNumber(is.incomeTax),
    };

    // Calculate all intermediate values
    const totalCostOfSales = incomeData.costOfSales + incomeData.staffCostsSales;
    const totalAdminExpenses = incomeData.adminExpenses + incomeData.staffCostsAdmin;

    const grossMargin = ratios.calculateGrossMargin(incomeData.revenue, totalCostOfSales);
    const ebitda = ratios.calculateEBITDA(
      incomeData.revenue,
      totalCostOfSales,
      incomeData.adminExpenses,
      incomeData.staffCostsAdmin
    );
    const operatingIncome = ratios.calculateOperatingIncome(
      incomeData.revenue,
      totalCostOfSales,
      incomeData.adminExpenses,
      incomeData.staffCostsAdmin,
      incomeData.depreciation
    );
    const ebit = ratios.calculateEBIT(
      incomeData.revenue,
      totalCostOfSales,
      incomeData.adminExpenses,
      incomeData.staffCostsAdmin,
      incomeData.depreciation,
      incomeData.exceptionalIncome,
      incomeData.exceptionalExpenses
    );
    const ebt = ratios.calculateEBT(
      incomeData.revenue,
      totalCostOfSales,
      incomeData.adminExpenses,
      incomeData.staffCostsAdmin,
      incomeData.depreciation,
      incomeData.exceptionalIncome,
      incomeData.exceptionalExpenses,
      incomeData.financialIncome,
      incomeData.financialExpenses
    );
    const netIncome = ratios.calculateNetIncome(
      incomeData.revenue,
      totalCostOfSales,
      incomeData.adminExpenses,
      incomeData.staffCostsAdmin,
      incomeData.depreciation,
      incomeData.exceptionalIncome,
      incomeData.exceptionalExpenses,
      incomeData.financialIncome,
      incomeData.financialExpenses,
      incomeData.incomeTax
    );

    // Calculate balance sheet totals
    const totalAssets = ratios.calculateTotalAssets(balanceData);
    const currentAssets = ratios.calculateCurrentAssets(balanceData);
    const nonCurrentAssets = ratios.calculateNonCurrentAssets(balanceData);
    const equity = ratios.calculateEquity(balanceData);
    const totalLiabilities = ratios.calculateTotalLiabilities(balanceData);
    const currentLiabilities = ratios.calculateCurrentLiabilities(balanceData);
    const nonCurrentLiabilities = ratios.calculateNonCurrentLiabilities(balanceData);
    const workingCapital = ratios.calculateWorkingCapital(balanceData);

    // Calculate all ratios
    const calculatedRatios = {
      // Liquidity ratios
      currentRatio: ratios.calculateCurrentRatio(balanceData),
      quickRatio: ratios.calculateAcidTest(balanceData),
      cashRatio: ratios.calculateCashRatio(balanceData),

      // Leverage ratios
      debtToEquity: ratios.calculateDebtToEquityRatio(balanceData),
      debtToAssets: ratios.calculateDebtToAssetsRatio(balanceData),
      debtToEbitda: ratios.calculateDebtToEBITDA(balanceData, ebitda),
      capitalizationRatio: ratios.calculateCapitalizationRatio(balanceData),

      // Profitability ratios
      roe: ratios.calculateROE(netIncome, equity),
      roa: ratios.calculateROA(ebitda, incomeData.depreciation, totalAssets),
      roi: ratios.calculateROI(ebit, equity, balanceData.bankDebtLp + balanceData.bankDebtSp),
      ros: ratios.calculateROS(netIncome, incomeData.revenue),

      // Margin ratios
      grossMarginPercent: ratios.calculateGrossMarginPercent(incomeData.revenue, totalCostOfSales),
      ebitdaMargin: ratios.calculateEBITDAMargin(ebitda, incomeData.revenue),
      ebitMargin: ratios.calculateEBITMargin(ebit, incomeData.revenue),
      netMargin: ratios.calculateNetMargin(netIncome, incomeData.revenue),

      // Activity ratios
      assetTurnover: ratios.calculateAssetTurnover(incomeData.revenue, totalAssets),
      inventoryTurnover: ratios.calculateInventoryTurnoverCost(totalCostOfSales, balanceData.inventory),
      daysSalesOutstanding: ratios.calculateDaysSalesOutstanding(balanceData.accountsReceivable, incomeData.revenue),
      daysPayableOutstanding: ratios.calculateDaysPayableOutstanding(balanceData.accountsPayable, totalCostOfSales),
      daysInventoryOutstanding: ratios.calculateDaysInventoryOutstanding(balanceData.inventory, totalCostOfSales),
      cashConversionCycle: ratios.calculateCashConversionCycle(
        balanceData.accountsReceivable,
        balanceData.inventory,
        balanceData.accountsPayable,
        incomeData.revenue,
        totalCostOfSales
      ),

      // Risk analysis
      altmanZScore: ratios.calculateAltmanZScore(
        workingCapital,
        balanceData.retainedEarnings,
        ebit,
        equity,
        totalAssets,
        totalLiabilities,
        incomeData.revenue
      ),
      springateScore: ratios.calculateSpringateScore(
        workingCapital,
        ebit,
        ebt,
        incomeData.revenue,
        totalAssets,
        currentLiabilities
      ),

      // Productivity (if employee data available)
      revenuePerEmployee: fiscalYear.additionalData?.averageEmployees
        ? ratios.calculateRevenuePerEmployee(incomeData.revenue, fiscalYear.additionalData.averageEmployees)
        : null,
      ebitdaPerEmployee: fiscalYear.additionalData?.averageEmployees
        ? ratios.calculateEBITDAPerEmployee(ebitda, fiscalYear.additionalData.averageEmployees)
        : null,
      netIncomePerEmployee: fiscalYear.additionalData?.averageEmployees
        ? ratios.calculateNetIncomePerEmployee(netIncome, fiscalYear.additionalData.averageEmployees)
        : null,
    };

    console.log('[RATIOS] Calculated Ratios:', JSON.stringify(calculatedRatios, null, 2));
    console.log('[RATIOS] Current Assets:', ratios.calculateCurrentAssets(balanceData));
    console.log('[RATIOS] Current Liabilities:', ratios.calculateCurrentLiabilities(balanceData));

    // Save or update calculated ratios in database
    const savedRatios = await prisma.calculatedRatios.upsert({
      where: { fiscalYearId },
      create: {
        fiscalYearId,
        // Liquidity
        currentRatio: calculatedRatios.currentRatio,
        quickRatio: calculatedRatios.quickRatio,
        cashRatio: calculatedRatios.cashRatio,

        // Leverage
        debtToEquity: calculatedRatios.debtToEquity,
        debtToAssets: calculatedRatios.debtToAssets,
        debtToEbitda: calculatedRatios.debtToEbitda,

        // Profitability
        roe: calculatedRatios.roe,
        roa: calculatedRatios.roa,
        roi: calculatedRatios.roi,
        ros: calculatedRatios.ros,

        // Margins
        grossMargin: calculatedRatios.grossMarginPercent,
        ebitdaMargin: calculatedRatios.ebitdaMargin,
        ebitMargin: calculatedRatios.ebitMargin,
        netMargin: calculatedRatios.netMargin,

        // Activity
        assetTurnover: calculatedRatios.assetTurnover,
        inventoryTurnover: calculatedRatios.inventoryTurnover,
        daysSalesOutstanding: calculatedRatios.daysSalesOutstanding,
        daysPayableOutstanding: calculatedRatios.daysPayableOutstanding,
        daysInventoryOutstanding: calculatedRatios.daysInventoryOutstanding,

        // Risk
        altmanZScore: calculatedRatios.altmanZScore,
      },
      update: {
        // Liquidity
        currentRatio: calculatedRatios.currentRatio,
        quickRatio: calculatedRatios.quickRatio,
        cashRatio: calculatedRatios.cashRatio,

        // Leverage
        debtToEquity: calculatedRatios.debtToEquity,
        debtToAssets: calculatedRatios.debtToAssets,
        debtToEbitda: calculatedRatios.debtToEbitda,

        // Profitability
        roe: calculatedRatios.roe,
        roa: calculatedRatios.roa,
        roi: calculatedRatios.roi,
        ros: calculatedRatios.ros,

        // Margins
        grossMargin: calculatedRatios.grossMarginPercent,
        ebitdaMargin: calculatedRatios.ebitdaMargin,
        ebitMargin: calculatedRatios.ebitMargin,
        netMargin: calculatedRatios.netMargin,

        // Activity
        assetTurnover: calculatedRatios.assetTurnover,
        inventoryTurnover: calculatedRatios.inventoryTurnover,
        daysSalesOutstanding: calculatedRatios.daysSalesOutstanding,
        daysPayableOutstanding: calculatedRatios.daysPayableOutstanding,
        daysInventoryOutstanding: calculatedRatios.daysInventoryOutstanding,

        // Risk
        altmanZScore: calculatedRatios.altmanZScore,

        calculatedAt: new Date(),
      },
    });

    return {
      ratios: calculatedRatios,
      intermediateValues: {
        grossMargin,
        ebitda,
        operatingIncome,
        ebit,
        ebt,
        netIncome,
        totalAssets,
        currentAssets,
        nonCurrentAssets,
        equity,
        totalLiabilities,
        currentLiabilities,
        nonCurrentLiabilities,
        workingCapital,
      },
      savedRatios,
    };
  }

  /**
   * Get calculated ratios for a fiscal year
   */
  async getRatios(fiscalYearId: string) {
    const ratios = await prisma.calculatedRatios.findUnique({
      where: { fiscalYearId },
    });

    return ratios;
  }

  /**
   * Calculate ratios for all years of a company
   */
  async calculateRatiosForCompany(companyId: string) {
    const fiscalYears = await prisma.fiscalYear.findMany({
      where: { companyId },
      orderBy: { year: 'desc' },
    });

    const results = [];

    for (const fy of fiscalYears) {
      try {
        const result = await this.calculateRatiosForYear(fy.id);
        results.push({
          year: fy.year,
          success: true,
          data: result,
        });
      } catch (error: any) {
        results.push({
          year: fy.year,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get complete financial analysis for a company (all years)
   */
  async getCompanyAnalysis(companyId: string) {
    console.log('[ANALYSIS] Getting company analysis for companyId:', companyId);
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        fiscalYears: {
          include: {
            balanceSheet: true,
            incomeStatement: true,
            cashFlow: true,
            additionalData: true,
          },
          orderBy: { year: 'desc' },
        },
      },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    console.log('[ANALYSIS] Found company:', company.name);
    console.log('[ANALYSIS] Fiscal years count:', company.fiscalYears.length);

    const yearsAnalysis = [];

    for (const fy of company.fiscalYears) {
      console.log('[ANALYSIS] Processing year:', fy.year);

      // Log balance sheet data types
      if (fy.balanceSheet) {
        console.log('[ANALYSIS] Balance Sheet - tangibleAssets type:', typeof fy.balanceSheet.tangibleAssets);
        console.log('[ANALYSIS] Balance Sheet - tangibleAssets value:', fy.balanceSheet.tangibleAssets);
        console.log('[ANALYSIS] Balance Sheet - tangibleAssets constructor:', fy.balanceSheet.tangibleAssets?.constructor?.name);
      }

      const calculatedRatios = await this.getRatios(fy.id);

      yearsAnalysis.push({
        year: fy.year,
        balanceSheet: fy.balanceSheet,
        incomeStatement: fy.incomeStatement,
        cashFlow: fy.cashFlow,
        additionalData: fy.additionalData,
        ratios: calculatedRatios,
      });
    }

    console.log('[ANALYSIS] Years analysis created, count:', yearsAnalysis.length);

    const result = {
      company,
      analysis: yearsAnalysis,
    };

    console.log('[ANALYSIS] Returning result (before bigIntToJSON)');
    return result;
  }
}
