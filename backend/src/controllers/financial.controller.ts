import { Request, Response } from 'express';
import { financialService } from '../services/financial.service';
import { convertBigIntToString } from '../utils/bigint';

export const financialController = {
  // ============= FISCAL YEARS =============

  async getFiscalYears(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { companyId } = req.params;

      const fiscalYears = await financialService.getFiscalYears(companyId, userId);

      res.json({
        success: true,
        data: convertBigIntToString(fiscalYears),
      });
    } catch (error: any) {
      console.error('Error getting fiscal years:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener años fiscales',
      });
    }
  },

  async createFiscalYear(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { companyId } = req.params;
      const { year, quarter, startDate, endDate } = req.body;

      const fiscalYear = await financialService.createFiscalYear(companyId, userId, {
        year: parseInt(year),
        quarter: quarter !== undefined ? parseInt(quarter) : 0,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      res.json({
        success: true,
        data: convertBigIntToString(fiscalYear),
      });
    } catch (error: any) {
      console.error('Error creating fiscal year:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al crear año fiscal',
      });
    }
  },

  // ============= BALANCE SHEET =============

  async getBalanceSheet(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { fiscalYearId } = req.params;

      const balanceSheet = await financialService.getBalanceSheet(fiscalYearId, userId);

      res.json({
        success: true,
        data: convertBigIntToString(balanceSheet),
      });
    } catch (error: any) {
      console.error('Error getting balance sheet:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener balance',
      });
    }
  },

  async upsertBalanceSheet(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { fiscalYearId } = req.params;
      const data = req.body;

      const balanceSheet = await financialService.upsertBalanceSheet(fiscalYearId, userId, data);

      res.json({
        success: true,
        data: convertBigIntToString(balanceSheet),
        message: 'Balance guardado exitosamente',
      });
    } catch (error: any) {
      console.error('Error upserting balance sheet:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al guardar balance',
      });
    }
  },

  // ============= INCOME STATEMENT =============

  async getIncomeStatement(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { fiscalYearId } = req.params;

      const incomeStatement = await financialService.getIncomeStatement(fiscalYearId, userId);

      res.json({
        success: true,
        data: convertBigIntToString(incomeStatement),
      });
    } catch (error: any) {
      console.error('Error getting income statement:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener cuenta de P&G',
      });
    }
  },

  async upsertIncomeStatement(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { fiscalYearId } = req.params;
      const data = req.body;

      const incomeStatement = await financialService.upsertIncomeStatement(fiscalYearId, userId, data);

      res.json({
        success: true,
        data: convertBigIntToString(incomeStatement),
        message: 'Cuenta de P&G guardada exitosamente',
      });
    } catch (error: any) {
      console.error('Error upserting income statement:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al guardar cuenta de P&G',
      });
    }
  },

  // ============= CASH FLOW =============

  async getCashFlow(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { fiscalYearId } = req.params;

      const cashFlow = await financialService.getCashFlow(fiscalYearId, userId);

      res.json({
        success: true,
        data: convertBigIntToString(cashFlow),
      });
    } catch (error: any) {
      console.error('Error getting cash flow:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener flujos de efectivo',
      });
    }
  },

  async upsertCashFlow(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { fiscalYearId } = req.params;
      const data = req.body;

      const cashFlow = await financialService.upsertCashFlow(fiscalYearId, userId, data);

      res.json({
        success: true,
        data: convertBigIntToString(cashFlow),
        message: 'Flujos de efectivo guardados exitosamente',
      });
    } catch (error: any) {
      console.error('Error upserting cash flow:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al guardar flujos de efectivo',
      });
    }
  },

  // ============= ADDITIONAL DATA =============

  async getAdditionalData(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { fiscalYearId } = req.params;

      const additionalData = await financialService.getAdditionalData(fiscalYearId, userId);

      res.json({
        success: true,
        data: convertBigIntToString(additionalData),
      });
    } catch (error: any) {
      console.error('Error getting additional data:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener datos adicionales',
      });
    }
  },

  async upsertAdditionalData(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { fiscalYearId } = req.params;
      const data = req.body;

      const additionalData = await financialService.upsertAdditionalData(fiscalYearId, userId, data);

      res.json({
        success: true,
        data: convertBigIntToString(additionalData),
        message: 'Datos adicionales guardados exitosamente',
      });
    } catch (error: any) {
      console.error('Error upserting additional data:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al guardar datos adicionales',
      });
    }
  },

  // ============= SUMMARY =============

  async getFiscalYearSummary(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { fiscalYearId } = req.params;

      const summary = await financialService.getFiscalYearSummary(fiscalYearId, userId);

      res.json({
        success: true,
        data: convertBigIntToString(summary),
      });
    } catch (error: any) {
      console.error('Error getting fiscal year summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener resumen del año fiscal',
      });
    }
  },
};
