import api from './api';
import type {
  FiscalYear,
  CreateFiscalYearData,
  BalanceSheet,
  CreateBalanceSheetData,
  IncomeStatement,
  CreateIncomeStatementData,
  CashFlow,
  CreateCashFlowData,
  AdditionalData,
  CreateAdditionalDataData,
} from '../types/financial';

export const financialService = {
  // Fiscal Years
  async getFiscalYears(companyId: string): Promise<FiscalYear[]> {
    const response = await api.get(`/financial/companies/${companyId}/fiscal-years`);
    return response.data.data;
  },

  async getFiscalYear(companyId: string, year: number): Promise<FiscalYear> {
    const response = await api.get(`/financial/companies/${companyId}/fiscal-years/${year}`);
    return response.data.data;
  },

  async createFiscalYear(companyId: string, data: CreateFiscalYearData): Promise<FiscalYear> {
    const response = await api.post(`/financial/companies/${companyId}/fiscal-years`, data);
    return response.data.data;
  },

  // Balance Sheet
  async getBalanceSheet(fiscalYearId: string): Promise<BalanceSheet | null> {
    try {
      const response = await api.get(`/financial/fiscal-years/${fiscalYearId}/balance-sheet`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async createOrUpdateBalanceSheet(
    fiscalYearId: string,
    data: CreateBalanceSheetData
  ): Promise<BalanceSheet> {
    const response = await api.post(`/financial/fiscal-years/${fiscalYearId}/balance-sheet`, data);
    return response.data.data;
  },

  // Income Statement
  async getIncomeStatement(fiscalYearId: string): Promise<IncomeStatement | null> {
    try {
      const response = await api.get(`/financial/fiscal-years/${fiscalYearId}/income-statement`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async createOrUpdateIncomeStatement(
    fiscalYearId: string,
    data: CreateIncomeStatementData
  ): Promise<IncomeStatement> {
    const response = await api.post(`/financial/fiscal-years/${fiscalYearId}/income-statement`, data);
    return response.data.data;
  },

  // Cash Flow
  async getCashFlow(fiscalYearId: string): Promise<CashFlow | null> {
    try {
      const response = await api.get(`/financial/fiscal-years/${fiscalYearId}/cash-flow`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async createOrUpdateCashFlow(
    fiscalYearId: string,
    data: CreateCashFlowData
  ): Promise<CashFlow> {
    const response = await api.post(`/financial/fiscal-years/${fiscalYearId}/cash-flow`, data);
    return response.data.data;
  },

  // Additional Data
  async getAdditionalData(fiscalYearId: string): Promise<AdditionalData | null> {
    try {
      const response = await api.get(`/financial/fiscal-years/${fiscalYearId}/additional-data`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async createOrUpdateAdditionalData(
    fiscalYearId: string,
    data: CreateAdditionalDataData
  ): Promise<AdditionalData> {
    const response = await api.post(`/financial/fiscal-years/${fiscalYearId}/additional-data`, data);
    return response.data.data;
  },
};

export default financialService;
