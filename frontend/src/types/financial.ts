// Tipos para datos financieros

export interface FiscalYear {
  id: string;
  companyId: string;
  year: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  balanceSheet?: BalanceSheet;
  incomeStatement?: IncomeStatement;
  cashFlow?: CashFlow;
  additionalData?: AdditionalData;
}

export interface BalanceSheet {
  id: string;
  fiscalYearId: string;

  // ACTIVO NO CORRIENTE
  tangibleAssets: number;
  intangibleAssets: number;
  financialInvestmentsLp: number;
  otherNoncurrentAssets: number;

  // ACTIVO CORRIENTE
  inventory: number;
  accountsReceivable: number;
  otherReceivables: number;
  taxReceivables: number;
  cashEquivalents: number;

  // PATRIMONIO NETO
  shareCapital: number;
  reserves: number;
  retainedEarnings: number;
  treasuryStock: number;

  // PASIVO NO CORRIENTE
  provisionsLp: number;
  bankDebtLp: number;
  otherLiabilitiesLp: number;

  // PASIVO CORRIENTE
  provisionsSp: number;
  bankDebtSp: number;
  accountsPayable: number;
  taxLiabilities: number;
  otherLiabilitiesSp: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeStatement {
  id: string;
  fiscalYearId: string;

  // INGRESOS
  revenue: number;
  otherOperatingIncome: number;

  // COSTES
  costOfSales: number;
  staffCostsSales: number;

  // GASTOS
  adminExpenses: number;
  staffCostsAdmin: number;
  depreciation: number;

  // RESULTADO EXCEPCIONAL
  exceptionalIncome: number;
  exceptionalExpenses: number;

  // RESULTADO FINANCIERO
  financialIncome: number;
  financialExpenses: number;

  // IMPUESTOS
  incomeTax: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashFlow {
  id: string;
  fiscalYearId: string;

  // OPERACIONES
  operatingCashFlow: number;
  cfEbtAdjustments: number;
  cfWorkingCapital: number;

  // INVERSIÓN
  cfInvestments: number;
  cfDivestments: number;

  // FINANCIACIÓN
  cfDebtObtained: number;
  cfDebtRepaid: number;
  cfDividendsPaid: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdditionalData {
  id: string;
  fiscalYearId: string;

  // ACCIONES Y MERCADO
  sharesOutstanding?: number;
  sharePrice?: number;
  dividendsPerShare?: number;

  // PERSONAL
  averageEmployees?: number;

  // VALORACIÓN
  marketCap?: number;
  enterpriseValue?: number;

  // INVENTARIO Y COMPRAS
  averageInventory?: number;
  materialCost?: number;
  purchases?: number;

  // IMPUESTOS (IVA)
  averageVatSales?: number;
  averageVatPurchases?: number;

  // FINANCIACIÓN
  loanAmortization?: number;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// DTOs para crear/actualizar
export interface CreateFiscalYearData {
  year: number;
  startDate?: string;
  endDate?: string;
}

export interface CreateBalanceSheetData {
  tangibleAssets?: number;
  intangibleAssets?: number;
  financialInvestmentsLp?: number;
  otherNoncurrentAssets?: number;
  inventory?: number;
  accountsReceivable?: number;
  otherReceivables?: number;
  taxReceivables?: number;
  cashEquivalents?: number;
  shareCapital?: number;
  reserves?: number;
  retainedEarnings?: number;
  treasuryStock?: number;
  provisionsLp?: number;
  bankDebtLp?: number;
  otherLiabilitiesLp?: number;
  provisionsSp?: number;
  bankDebtSp?: number;
  accountsPayable?: number;
  taxLiabilities?: number;
  otherLiabilitiesSp?: number;
  notes?: string;
}

export interface CreateIncomeStatementData {
  revenue?: number;
  otherOperatingIncome?: number;
  costOfSales?: number;
  staffCostsSales?: number;
  adminExpenses?: number;
  staffCostsAdmin?: number;
  depreciation?: number;
  exceptionalIncome?: number;
  exceptionalExpenses?: number;
  financialIncome?: number;
  financialExpenses?: number;
  incomeTax?: number;
  notes?: string;
}

export interface CreateCashFlowData {
  operatingCashFlow?: number;
  cfEbtAdjustments?: number;
  cfWorkingCapital?: number;
  cfInvestments?: number;
  cfDivestments?: number;
  cfDebtObtained?: number;
  cfDebtRepaid?: number;
  cfDividendsPaid?: number;
  notes?: string;
}

export interface CreateAdditionalDataData {
  sharesOutstanding?: number;
  sharePrice?: number;
  dividendsPerShare?: number;
  averageEmployees?: number;
  marketCap?: number;
  enterpriseValue?: number;
  averageInventory?: number;
  materialCost?: number;
  purchases?: number;
  averageVatSales?: number;
  averageVatPurchases?: number;
  loanAmortization?: number;
  notes?: string;
}
