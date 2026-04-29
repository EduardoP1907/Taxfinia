import { api } from './api';

export interface CalculatedRatios {
  id: string;
  fiscalYearId: string;

  // Liquidity Ratios
  currentRatio: number | null;
  quickRatio: number | null;
  cashRatio: number | null;

  // Leverage Ratios
  debtToEquity: number | null;
  debtToAssets: number | null;
  debtToEbitda: number | null;

  // Profitability Ratios
  roe: number | null;
  roa: number | null;
  roi: number | null;
  ros: number | null;

  // Margin Ratios
  grossMargin: number | null;
  ebitdaMargin: number | null;
  ebitMargin: number | null;
  netMargin: number | null;

  // Activity Ratios
  assetTurnover: number | null;
  inventoryTurnover: number | null;
  daysSalesOutstanding: number | null;
  daysPayableOutstanding: number | null;
  daysInventoryOutstanding: number | null;

  // Risk Ratios
  altmanZScore: number | null;
  springateScore: number | null;

  // Additional
  cashConversionCycle: number | null;
  capitalizationRatio: number | null;
  revenuePerEmployee: number | null;
  ebitdaPerEmployee: number | null;
  netIncomePerEmployee: number | null;

  calculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntermediateValues {
  grossMargin: number;
  ebitda: number;
  operatingIncome: number;
  ebit: number;
  ebt: number;
  netIncome: number;
  totalAssets: number;
  currentAssets: number;
  nonCurrentAssets: number;
  equity: number;
  totalLiabilities: number;
  currentLiabilities: number;
  nonCurrentLiabilities: number;
  workingCapital: number;
}

export interface RatiosCalculationResult {
  ratios: Partial<CalculatedRatios>;
  intermediateValues: IntermediateValues;
  savedRatios: CalculatedRatios;
}

export interface CompanyAnalysisYear {
  year: number;
  balanceSheet: any;
  incomeStatement: any;
  cashFlow: any;
  additionalData: any;
  ratios: CalculatedRatios | null;
}

export interface CompanyAnalysis {
  company: any;
  analysis: CompanyAnalysisYear[];
}

class RatiosService {
  async calculateRatios(fiscalYearId: string): Promise<RatiosCalculationResult> {
    const response = await api.post(`/ratios/calculate/${fiscalYearId}`);
    return response.data.data;
  }

  async getRatios(fiscalYearId: string): Promise<CalculatedRatios | null> {
    try {
      const response = await api.get(`/ratios/${fiscalYearId}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async calculateCompanyRatios(companyId: string): Promise<any[]> {
    const response = await api.post(`/ratios/calculate-company/${companyId}`);
    return response.data.data;
  }

  async getCompanyAnalysis(companyId: string): Promise<CompanyAnalysis> {
    const response = await api.get(`/ratios/company-analysis/${companyId}`);
    return response.data.data;
  }
}

export const ratiosService = new RatiosService();
