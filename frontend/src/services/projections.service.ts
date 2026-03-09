/**
 * Projections Service
 * Servicio para gestionar proyecciones financieras
 */

import api from './api';

export interface ProjectionScenario {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  baseYear: number;
  projectionYears: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialProjection {
  id: string;
  scenarioId: string;
  year: number;

  // Balance Sheet (Sheet 4.1)
  totalAssets: number;
  totalAssetsGrowthRate: number | null;
  equity: number;
  equityGrowthRate: number | null;
  totalLiabilities: number;
  totalLiabilitiesGrowthRate: number | null;

  // Income Statement
  revenue: number;
  revenueGrowthRate: number | null;
  costOfSales: number;
  costOfSalesGrowthRate: number | null;
  otherOperatingExpenses: number;
  otherOperatingExpensesGrowthRate: number | null;
  depreciation: number;
  depreciationGrowthRate: number | null;

  // Financial Results
  exceptionalNet: number;
  exceptionalNetGrowthRate: number | null;
  financialIncome: number;
  financialIncomeGrowthRate: number | null;
  financialExpenses: number;
  financialExpensesGrowthRate: number | null;

  // Tax
  taxRate: number;

  // Calculated Metrics (Auto-calculated by backend)
  ebitda: number;
  ebit: number;
  nopat: number;
  ebt: number;
  netIncome: number;
  incomeTax: number;
  financialNet: number;

  // Ratios (Auto-calculated)
  roa: number | null;
  roe: number | null;
  financialLeverage: number | null;
  operationalRisk: number | null;
  financialRisk: number | null;

  // Cash Flow
  workingCapitalInvestment: number;
  workingCapitalInvestmentGrowthRate: number | null;
  fixedAssetsInvestment: number;
  fixedAssetsInvestmentGrowthRate: number | null;
  grossCashFlow: number;
  freeCashFlow: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectionScenarioWithData extends ProjectionScenario {
  projections: FinancialProjection[];
  company?: any;
  // DCF Parameters (Hoja 4.3)
  riskFreeRate?: number;
  beta?: number;
  marketRiskPremium?: number;
  costOfEquity?: number;
  costOfDebt?: number;
  taxRateForWacc?: number;
  wacc?: number;
  terminalGrowthRate?: number;
  netDebt?: number;
  // DCF Results
  sumPvOfFCFs?: number;
  terminalValue?: number;
  pvOfTerminalValue?: number;
  enterpriseValue?: number;
  equityValue?: number;
  valuePerShare?: number;
}

// DCF Interfaces
export interface DCFParameters {
  wacc?: number;                 // WACC directo (decimal, ej: 0.08 = 8%) — preferido sobre el calculado
  riskFreeRate?: number;        // Rf (decimal, ej: 0.025 = 2.5%)
  beta?: number;                 // β
  marketRiskPremium?: number;    // Prima de riesgo (decimal, ej: 0.06 = 6%)
  costOfDebt?: number;           // Kd (decimal)
  taxRateForWacc?: number;       // Tasa impositiva para WACC
  terminalGrowthRate?: number;   // g perpetuo (decimal, ej: 0.02 = 2%)
  netDebt?: number;              // Deuda neta
}

export interface DCFResults {
  // Parámetros WACC
  riskFreeRate: number;
  beta: number;
  marketRiskPremium: number;
  costOfEquity: number;
  costOfDebt: number;
  taxRateForWacc: number;
  wacc: number;
  // Parámetros de valoración
  terminalGrowthRate: number;
  netDebt: number;
  // Resultados
  sumPvOfFCFs: number;
  terminalValue: number;
  pvOfTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  valuePerShare: number;
  // Proyecciones con discount factors
  projections: Array<{
    year: number;
    freeCashFlow: number;
    discountFactor: number;
    pvOfFCF: number;
  }>;
}

export const projectionsService = {
  /**
   * Crear nuevo escenario de proyección
   */
  async createScenario(data: {
    companyId: string;
    baseYear?: number;
    projectionYears?: number;
    name?: string;
  }) {
    const response = await api.post('/projections', data);
    return response.data;
  },

  /**
   * Obtener todos los escenarios de una empresa
   */
  async getCompanyScenarios(companyId: string): Promise<ProjectionScenarioWithData[]> {
    const response = await api.get(`/projections/company/${companyId}`);
    return response.data;
  },

  /**
   * Obtener un escenario específico con sus proyecciones
   */
  async getScenario(scenarioId: string): Promise<ProjectionScenarioWithData> {
    const response = await api.get(`/projections/${scenarioId}`);
    return response.data;
  },

  /**
   * Actualizar una proyección específica
   */
  async updateProjection(projectionId: string, data: Partial<FinancialProjection>) {
    const response = await api.put(`/projections/projection/${projectionId}`, data);
    return response.data;
  },

  /**
   * Actualizar múltiples proyecciones a la vez
   */
  async updateBulkProjections(
    scenarioId: string,
    projections: Array<{ year: number; [key: string]: any }>
  ) {
    const response = await api.put(`/projections/${scenarioId}/bulk`, { projections });
    return response.data;
  },

  /**
   * Aplicar tasas de crecimiento uniformes (simplificado)
   * Las tasas se pasan en porcentaje (ej: 5 = 5%)
   */
  async applyUniformGrowthRates(scenarioId: string, rates: {
    totalAssets?: number;
    equity?: number;
    totalLiabilities?: number;
    revenue?: number;
    costOfSales?: number;
    otherOperatingExpenses?: number;
    depreciation?: number;
    exceptionalNet?: number;
    financialIncome?: number;
    financialExpenses?: number;
    workingCapitalInvestment?: number;
    fixedAssetsInvestment?: number;
    incomeTaxRate?: number;
  }) {
    const response = await api.post(`/projections/${scenarioId}/apply-uniform-growth-rates`, rates);
    return response.data;
  },

  /**
   * Aplicar tasas de crecimiento a todas las proyecciones
   */
  async applyGrowthRates(scenarioId: string, growthRatesByYear: Array<{
    year: number;
    // Balance Sheet Growth Rates
    totalAssetsGrowthRate?: number;
    equityGrowthRate?: number;
    totalLiabilitiesGrowthRate?: number;
    // Income Statement Growth Rates
    revenueGrowthRate?: number;
    costOfSalesGrowthRate?: number;
    otherOperatingExpensesGrowthRate?: number;
    depreciationGrowthRate?: number;
    // Financial Results Growth Rates
    exceptionalNetGrowthRate?: number;
    financialIncomeGrowthRate?: number;
    financialExpensesGrowthRate?: number;
    // Tax Rate
    taxRate?: number;
    // Investments and Cash Flow
    workingCapitalInvestmentGrowthRate?: number;
    fixedAssetsInvestmentGrowthRate?: number;
  }>) {
    const response = await api.post(`/projections/${scenarioId}/apply-growth-rates`, {
      growthRatesByYear
    });
    return response.data;
  },

  /**
   * Recalcular todas las métricas de un escenario
   */
  async recalculateMetrics(scenarioId: string) {
    const response = await api.post(`/projections/${scenarioId}/recalculate`);
    return response.data;
  },

  /**
   * Actualizar configuración del escenario
   */
  async updateScenarioConfig(scenarioId: string, data: {
    name?: string;
    description?: string;
    projectionYears?: number;
  }) {
    const response = await api.put(`/projections/${scenarioId}/config`, data);
    return response.data;
  },

  /**
   * Eliminar escenario
   */
  async deleteScenario(scenarioId: string) {
    const response = await api.delete(`/projections/${scenarioId}`);
    return response.data;
  },

  // ==================== MÉTODOS DCF (Hoja 4.3) ====================

  /**
   * Actualizar parámetros DCF (WACC, tasa de crecimiento terminal, etc.)
   * El backend calculará automáticamente Ke y WACC si se proporcionan todos los parámetros
   */
  async updateDCFParameters(scenarioId: string, params: DCFParameters) {
    const response = await api.put(`/projections/${scenarioId}/dcf-parameters`, params);
    return response.data;
  },

  /**
   * Calcular valoración DCF completa
   * Calcula:
   * - VP de cada Free Cash Flow
   * - Valor Terminal
   * - Enterprise Value
   * - Equity Value
   * - Valor por Acción
   */
  async calculateDCFValuation(scenarioId: string) {
    const response = await api.post(`/projections/${scenarioId}/calculate-dcf`);
    return response.data;
  },

  /**
   * Obtener resultados DCF de un escenario
   * Retorna todos los parámetros, cálculos intermedios y resultados finales
   */
  async getDCFResults(scenarioId: string): Promise<DCFResults> {
    const response = await api.get(`/projections/${scenarioId}/dcf-results`);
    return response.data;
  },
};
