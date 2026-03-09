import { Request, Response } from 'express';
import { RatiosService } from '../services/ratios.service';
import { bigIntToJSON } from '../utils/bigint';

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
      console.error('[CONTROLLER ERROR] Stack:', error.stack);
      res.status(500).json({
        error: 'Error fetching company analysis',
        message: error.message,
        stack: error.stack,
      });
    }
  };
}
