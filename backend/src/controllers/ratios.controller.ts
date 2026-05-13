import { Request, Response } from 'express';
import { RatiosService } from '../services/ratios.service';
import { bigIntToJSON } from '../utils/bigint';
import prisma from '../config/database';

export class RatiosController {
  private service = new RatiosService();

  /**
   * Calculate ratios for a specific fiscal year
   * POST /api/ratios/calculate/:fiscalYearId
   */
  calculateRatios = async (req: Request, res: Response) => {
    try {
      const { fiscalYearId } = req.params;

      const result = await this.service.calculateRatiosForYear(fiscalYearId);

      res.json({
        message: 'Ratios calculated successfully',
        data: bigIntToJSON(result),
      });
    } catch (error: any) {
      console.error('Error calculating ratios:', error);
      res.status(500).json({
        error: 'Error calculating ratios',
        message: error.message,
      });
    }
  };

  /**
   * Get calculated ratios for a fiscal year
   * GET /api/ratios/:fiscalYearId
   */
  getRatios = async (req: Request, res: Response) => {
    try {
      const { fiscalYearId } = req.params;

      const ratios = await this.service.getRatios(fiscalYearId);

      if (!ratios) {
        return res.status(404).json({
          error: 'Ratios not found. Please calculate ratios first.',
        });
      }

      res.json({
        data: bigIntToJSON(ratios),
      });
    } catch (error: any) {
      console.error('Error fetching ratios:', error);
      res.status(500).json({
        error: 'Error fetching ratios',
        message: error.message,
      });
    }
  };

  /**
   * Calculate ratios for all years of a company
   * POST /api/ratios/calculate-company/:companyId
   */
  calculateCompanyRatios = async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params;

      const results = await this.service.calculateRatiosForCompany(companyId);

      res.json({
        message: 'Company ratios calculated',
        data: bigIntToJSON(results),
      });
    } catch (error: any) {
      console.error('Error calculating company ratios:', error);
      res.status(500).json({
        error: 'Error calculating company ratios',
        message: error.message,
      });
    }
  };

  /**
   * Get complete financial analysis for a company
   * GET /api/ratios/company-analysis/:companyId
   */
  getCompanyAnalysis = async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params;
      console.log('[CONTROLLER] Getting company analysis for:', companyId);

      const analysis = await this.service.getCompanyAnalysis(companyId);
      console.log('[CONTROLLER] Analysis retrieved, sample data before conversion:');

      // Log a sample of the data structure before conversion
      if (analysis.analysis && analysis.analysis.length > 0) {
        const firstYear = analysis.analysis[0];
        console.log('[CONTROLLER] First year:', firstYear.year);
        if (firstYear.balanceSheet) {
          console.log('[CONTROLLER] Sample balance field - tangibleAssets:', {
            value: firstYear.balanceSheet.tangibleAssets,
            type: typeof firstYear.balanceSheet.tangibleAssets,
            constructor: firstYear.balanceSheet.tangibleAssets?.constructor?.name,
          });
        }
        if (firstYear.incomeStatement) {
          console.log('[CONTROLLER] Sample income field - revenue:', {
            value: firstYear.incomeStatement.revenue,
            type: typeof firstYear.incomeStatement.revenue,
            constructor: firstYear.incomeStatement.revenue?.constructor?.name,
          });
        }
      }

      console.log('[CONTROLLER] Starting bigIntToJSON conversion...');
      const jsonData = bigIntToJSON(analysis);
      console.log('[CONTROLLER] Conversion complete');

      // Log sample after conversion
      if (jsonData.analysis && jsonData.analysis.length > 0) {
        const firstYear = jsonData.analysis[0];
        if (firstYear.balanceSheet) {
          console.log('[CONTROLLER] After conversion - tangibleAssets:', {
            value: firstYear.balanceSheet.tangibleAssets,
            type: typeof firstYear.balanceSheet.tangibleAssets,
          });
        }
        if (firstYear.incomeStatement) {
          console.log('[CONTROLLER] After conversion - revenue:', {
            value: firstYear.incomeStatement.revenue,
            type: typeof firstYear.incomeStatement.revenue,
          });
        }
      }

      console.log('[CONTROLLER] Sending response');
      res.json({
        data: jsonData,
      });
    } catch (error: any) {
      console.error('[CONTROLLER ERROR] Error fetching company analysis:', error);
      res.status(500).json({
        error: 'Error fetching company analysis',
        message: error.message,
      });
    }
  };

  /**
   * GET /api/ratios/compare?companies=id1,id2,id3&year=2024
   * Returns key ratios for up to 3 companies side-by-side
   */
  compareCompanies = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const companyIds = ((req.query.companies as string) || '').split(',').filter(Boolean).slice(0, 3);
      const year = parseInt((req.query.year as string) || String(new Date().getFullYear()));

      if (companyIds.length < 2) {
        res.status(400).json({ error: 'Se requieren al menos 2 empresas para comparar' });
        return;
      }

      const results = await Promise.all(companyIds.map(async (companyId) => {
        const company = await prisma.company.findFirst({
          where: { id: companyId, userId, deletedAt: null },
          select: { id: true, name: true, currency: true, industry: true },
        });
        if (!company) return null;

        const fy = await prisma.fiscalYear.findFirst({
          where: { companyId, year, quarter: 0 },
          include: { calculatedRatios: true, incomeStatement: true, balanceSheet: true },
        });

        const ratios = fy?.calculatedRatios;
        const is = fy?.incomeStatement;
        const bs = fy?.balanceSheet;

        const toN = (v: any) => v == null ? null : parseFloat(v.toString());

        return {
          company,
          year,
          hasData: !!fy,
          income: is ? {
            revenue: toN(is.revenue),
            ebitda: is ? (() => {
              const rev = toN(is.revenue)! + toN(is.otherOperatingIncome)!;
              const cogs = toN(is.costOfSales)! + toN(is.staffCostsSales)!;
              const admin = toN(is.adminExpenses)! + toN(is.staffCostsAdmin)!;
              return rev - cogs - admin;
            })() : null,
            netIncome: is ? (() => {
              const rev = toN(is.revenue)! + toN(is.otherOperatingIncome)!;
              const cogs = toN(is.costOfSales)! + toN(is.staffCostsSales)!;
              const admin = toN(is.adminExpenses)! + toN(is.staffCostsAdmin)!;
              const ebitda = rev - cogs - admin;
              const ebit = ebitda - toN(is.depreciation)!;
              const excep = toN(is.exceptionalIncome)! - toN(is.exceptionalExpenses)!;
              const fin = toN(is.financialIncome)! - toN(is.financialExpenses)!;
              const ebt = ebit + excep + fin;
              return ebt - toN(is.incomeTax)!;
            })() : null,
          } : null,
          balance: bs ? {
            totalAssets: toN(bs.tangibleAssets)! + toN(bs.intangibleAssets)! + toN(bs.financialInvestmentsLp)! + toN(bs.otherNoncurrentAssets)! + toN(bs.inventory)! + toN(bs.accountsReceivable)! + toN(bs.otherReceivables)! + toN(bs.taxReceivables)! + toN(bs.cashEquivalents)!,
            equity: toN(bs.shareCapital)! + toN(bs.reserves)! + toN(bs.retainedEarnings)! - toN(bs.treasuryStock)!,
          } : null,
          ratios: ratios ? {
            currentRatio:     toN(ratios.currentRatio),
            quickRatio:       toN(ratios.quickRatio),
            debtToEquity:     toN(ratios.debtToEquity),
            debtToEbitda:     toN(ratios.debtToEbitda),
            roe:              toN(ratios.roe),
            roa:              toN(ratios.roa),
            grossMargin:      toN(ratios.grossMargin),
            ebitdaMargin:     toN(ratios.ebitdaMargin),
            netMargin:        toN(ratios.netMargin),
            assetTurnover:    toN(ratios.assetTurnover),
            altmanZScore:     toN(ratios.altmanZScore),
            daysSalesOutstanding:  toN(ratios.daysSalesOutstanding),
            daysPayableOutstanding: toN(ratios.daysPayableOutstanding),
          } : null,
        };
      }));

      res.json({ data: results.filter(Boolean) });
    } catch (error: any) {
      console.error('[COMPARE] Error:', error);
      res.status(500).json({ error: 'Error al comparar empresas', message: error.message });
    }
  };
}
