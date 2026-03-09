/**
 * Financial Ratios and Calculations
 *
 * All formulas based on TAXFINMHO2024.xlsx
 * References: FORMULAS-EXCEL.md
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BalanceSheetData {
  // Activo No Corriente
  tangibleAssets: number;
  intangibleAssets: number;
  financialInvestmentsLp: number;
  otherNoncurrentAssets: number;

  // Activo Corriente
  inventory: number;
  accountsReceivable: number;
  otherReceivables: number;
  taxReceivables: number;
  cashEquivalents: number;

  // Patrimonio Neto
  shareCapital: number;
  reserves: number;
  retainedEarnings: number;
  treasuryStock: number;

  // Pasivo No Corriente
  provisionsLp: number;
  bankDebtLp: number;
  otherLiabilitiesLp: number;

  // Pasivo Corriente
  provisionsSp: number;
  bankDebtSp: number;
  accountsPayable: number;
  taxLiabilities: number;
  otherLiabilitiesSp: number;
}

export interface IncomeStatementData {
  // Ingresos
  revenue: number;
  otherOperatingIncome: number;

  // Costes
  costOfSales: number;
  staffCostsSales: number;

  // Gastos
  adminExpenses: number;
  staffCostsAdmin: number;
  depreciation: number;

  // Excepcional
  exceptionalIncome: number;
  exceptionalExpenses: number;

  // Financiero
  financialIncome: number;
  financialExpenses: number;

  // Impuestos
  incomeTax: number;
}

export interface CashFlowData {
  operatingCashFlow: number;
  cfEbtAdjustments: number;
  cfWorkingCapital: number;
  cfInvestments: number;
  cfDivestments: number;
  cfDebtObtained: number;
  cfDebtRepaid: number;
  cfDividendsPaid: number;
}

export interface AdditionalData {
  sharesOutstanding?: bigint;
  sharePrice?: number;
  dividendsPerShare?: number;
  averageEmployees?: number;
  marketCap?: number;
  enterpriseValue?: number;
}

// ============================================================================
// CALCULATED VALUES (Sheet 2.1 - Income Statement Analysis)
// ============================================================================

/**
 * Calculate Gross Margin
 * Formula: Revenue - Cost of Sales
 * Sheet 2.1, Row 14
 */
export function calculateGrossMargin(revenue: number, costOfSales: number): number {
  return revenue - costOfSales;
}

/**
 * Calculate EBITDA (Earnings Before Interest, Taxes, Depreciation, Amortization)
 * Formula: Gross Margin - Operating Expenses
 * Sheet 2.1, Row 20
 */
export function calculateEBITDA(
  revenue: number,
  costOfSales: number,
  adminExpenses: number,
  staffCostsAdmin: number
): number {
  const grossMargin = calculateGrossMargin(revenue, costOfSales);
  const operatingExpenses = adminExpenses + staffCostsAdmin;
  return grossMargin - operatingExpenses;
}

/**
 * Calculate Operating Income (Resultado de Explotación)
 * Formula: EBITDA - Depreciation
 * Sheet 2.1, Row 24
 */
export function calculateOperatingIncome(
  revenue: number,
  costOfSales: number,
  adminExpenses: number,
  staffCostsAdmin: number,
  depreciation: number
): number {
  const ebitda = calculateEBITDA(revenue, costOfSales, adminExpenses, staffCostsAdmin);
  return ebitda - depreciation;
}

/**
 * Calculate EBIT (Earnings Before Interest and Taxes)
 * Formula: Operating Income + Exceptional Result
 * Sheet 2.1, Row 30
 */
export function calculateEBIT(
  revenue: number,
  costOfSales: number,
  adminExpenses: number,
  staffCostsAdmin: number,
  depreciation: number,
  exceptionalIncome: number,
  exceptionalExpenses: number
): number {
  const operatingIncome = calculateOperatingIncome(
    revenue,
    costOfSales,
    adminExpenses,
    staffCostsAdmin,
    depreciation
  );
  const exceptionalResult = exceptionalIncome - exceptionalExpenses;
  return operatingIncome + exceptionalResult;
}

/**
 * Calculate EBT (Earnings Before Taxes)
 * Formula: EBIT + Financial Result
 * Sheet 2.1, Row 38
 */
export function calculateEBT(
  revenue: number,
  costOfSales: number,
  adminExpenses: number,
  staffCostsAdmin: number,
  depreciation: number,
  exceptionalIncome: number,
  exceptionalExpenses: number,
  financialIncome: number,
  financialExpenses: number
): number {
  const ebit = calculateEBIT(
    revenue,
    costOfSales,
    adminExpenses,
    staffCostsAdmin,
    depreciation,
    exceptionalIncome,
    exceptionalExpenses
  );
  const financialResult = financialIncome - financialExpenses;
  return ebit + financialResult;
}

/**
 * Calculate Net Income (Resultado Neto)
 * Formula: EBT - Income Tax
 * Sheet 2.1, Row 42
 */
export function calculateNetIncome(
  revenue: number,
  costOfSales: number,
  adminExpenses: number,
  staffCostsAdmin: number,
  depreciation: number,
  exceptionalIncome: number,
  exceptionalExpenses: number,
  financialIncome: number,
  financialExpenses: number,
  incomeTax: number
): number {
  const ebt = calculateEBT(
    revenue,
    costOfSales,
    adminExpenses,
    staffCostsAdmin,
    depreciation,
    exceptionalIncome,
    exceptionalExpenses,
    financialIncome,
    financialExpenses
  );
  return ebt - incomeTax;
}

// ============================================================================
// BALANCE SHEET CALCULATIONS (Sheet 2.2)
// ============================================================================

/**
 * Calculate Total Non-Current Assets
 * Formula: Sum of all non-current assets
 */
export function calculateNonCurrentAssets(bs: BalanceSheetData): number {
  return (
    bs.tangibleAssets +
    bs.intangibleAssets +
    bs.financialInvestmentsLp +
    bs.otherNoncurrentAssets
  );
}

/**
 * Calculate Total Current Assets
 * Formula: Inventory + Receivables + Cash
 */
export function calculateCurrentAssets(bs: BalanceSheetData): number {
  return (
    bs.inventory +
    bs.accountsReceivable +
    bs.otherReceivables +
    bs.taxReceivables +
    bs.cashEquivalents
  );
}

/**
 * Calculate Total Assets
 */
export function calculateTotalAssets(bs: BalanceSheetData): number {
  return calculateNonCurrentAssets(bs) + calculateCurrentAssets(bs);
}

/**
 * Calculate Total Equity (Patrimonio Neto)
 */
export function calculateEquity(bs: BalanceSheetData): number {
  return (
    bs.shareCapital +
    bs.reserves +
    bs.retainedEarnings -
    bs.treasuryStock
  );
}

/**
 * Calculate Total Non-Current Liabilities
 */
export function calculateNonCurrentLiabilities(bs: BalanceSheetData): number {
  return (
    bs.provisionsLp +
    bs.bankDebtLp +
    bs.otherLiabilitiesLp
  );
}

/**
 * Calculate Total Current Liabilities
 */
export function calculateCurrentLiabilities(bs: BalanceSheetData): number {
  return (
    bs.provisionsSp +
    bs.bankDebtSp +
    bs.accountsPayable +
    bs.taxLiabilities +
    bs.otherLiabilitiesSp
  );
}

/**
 * Calculate Total Liabilities
 */
export function calculateTotalLiabilities(bs: BalanceSheetData): number {
  return calculateNonCurrentLiabilities(bs) + calculateCurrentLiabilities(bs);
}

/**
 * Calculate Working Capital (Fondo de Maniobra)
 * Formula: Current Assets - Current Liabilities
 */
export function calculateWorkingCapital(bs: BalanceSheetData): number {
  return calculateCurrentAssets(bs) - calculateCurrentLiabilities(bs);
}

// ============================================================================
// LIQUIDITY RATIOS (Sheet 2.4, Rows 52-55)
// ============================================================================

/**
 * Current Ratio (Ratio de Liquidez)
 * Formula: Current Assets / Current Liabilities
 * Sheet 2.4, Row 52 → CalcBal!K155
 * Value: 6.415790426302117
 */
export function calculateCurrentRatio(bs: BalanceSheetData): number | null {
  const currentAssets = calculateCurrentAssets(bs);
  const currentLiabilities = calculateCurrentLiabilities(bs);

  if (currentLiabilities === 0) return null;
  return currentAssets / currentLiabilities;
}

/**
 * Acid Test (Quick Ratio / Liquidez Inmediata)
 * Formula: (Current Assets - Inventory) / Current Liabilities
 * Sheet 2.4, Row 53 → CalcBal!K156
 * Value: 6.1711777607427285
 */
export function calculateAcidTest(bs: BalanceSheetData): number | null {
  const currentAssets = calculateCurrentAssets(bs);
  const currentLiabilities = calculateCurrentLiabilities(bs);

  if (currentLiabilities === 0) return null;
  return (currentAssets - bs.inventory) / currentLiabilities;
}

/**
 * Cash Ratio (Disponibilidad)
 * Formula: Cash / Current Liabilities
 * Sheet 2.4, Row 54 → CalcBal!K158
 * Value: 0.4557498615902219
 */
export function calculateCashRatio(bs: BalanceSheetData): number | null {
  const currentLiabilities = calculateCurrentLiabilities(bs);

  if (currentLiabilities === 0) return null;
  return bs.cashEquivalents / currentLiabilities;
}

// ============================================================================
// LEVERAGE RATIOS (Sheet 2.4, Rows 9-11)
// ============================================================================

/**
 * Capitalization Ratio (Capitalización)
 * Formula: Equity / (Equity + Non-Current Liabilities)
 * Sheet 2.4, Row 9 → CalcBal!K119
 * Value: 0.8662938275847489
 */
export function calculateCapitalizationRatio(bs: BalanceSheetData): number | null {
  const equity = calculateEquity(bs);
  const ncLiabilities = calculateNonCurrentLiabilities(bs);
  const denominator = equity + ncLiabilities;

  if (denominator === 0) return null;
  return equity / denominator;
}

/**
 * Debt to Equity Ratio (Ratio de Autonomía)
 * Formula: Equity / Total Liabilities
 * Sheet 2.4, Row 10
 * Value: 6.48
 */
export function calculateDebtToEquityRatio(bs: BalanceSheetData): number | null {
  const equity = calculateEquity(bs);
  const totalLiabilities = calculateTotalLiabilities(bs);

  if (totalLiabilities === 0) return null;
  return equity / totalLiabilities;
}

/**
 * Debt to Assets Ratio (Endeudamiento sobre Activos)
 * Formula: Total Liabilities / Total Assets
 */
export function calculateDebtToAssetsRatio(bs: BalanceSheetData): number | null {
  const totalLiabilities = calculateTotalLiabilities(bs);
  const totalAssets = calculateTotalAssets(bs);

  if (totalAssets === 0) return null;
  return totalLiabilities / totalAssets;
}

/**
 * Debt to EBITDA Ratio (Endeudamiento sobre EBITDA)
 * Formula: (Bank Debt LP + Bank Debt SP) / EBITDA
 */
export function calculateDebtToEBITDA(bs: BalanceSheetData, ebitda: number): number | null {
  const totalDebt = bs.bankDebtLp + bs.bankDebtSp;

  if (ebitda === 0) return null;
  return totalDebt / ebitda;
}

// ============================================================================
// PROFITABILITY RATIOS (Sheet 2.4)
// ============================================================================

/**
 * ROE (Return on Equity) - Rentabilidad Financiera
 * Formula: (Net Income / Equity) × 100
 */
export function calculateROE(netIncome: number, equity: number): number | null {
  if (equity === 0) return null;
  return (netIncome / equity) * 100;
}

/**
 * ROA (Return on Assets) - Rentabilidad Económica
 * Formula Excel (Hoja 4.1 G26): ROA = (Resultado Operativo / Total Activo) * 100
 * Donde Resultado Operativo = EBITDA - Depreciación (ANTES de excepcionales)
 *
 * IMPORTANTE: El Excel NO usa EBIT (que incluye excepcionales)
 */
export function calculateROA(ebitda: number, depreciation: number, totalAssets: number): number | null {
  if (totalAssets === 0) return null;
  const operatingResult = ebitda - depreciation;
  return (operatingResult / totalAssets) * 100;
}

/**
 * ROI (Return on Investment)
 * Formula: (EBIT / (Equity + Financial Debt)) × 100
 */
export function calculateROI(ebit: number, equity: number, financialDebt: number): number | null {
  const investedCapital = equity + financialDebt;
  if (investedCapital === 0) return null;
  return (ebit / investedCapital) * 100;
}

/**
 * ROS (Return on Sales)
 * Formula: (Net Income / Revenue) × 100
 */
export function calculateROS(netIncome: number, revenue: number): number | null {
  if (revenue === 0) return null;
  return (netIncome / revenue) * 100;
}

// ============================================================================
// MARGIN RATIOS (Sheet 2.1)
// ============================================================================

/**
 * Gross Margin %
 * Formula: ((Revenue - Cost of Sales) / Revenue) × 100
 */
export function calculateGrossMarginPercent(revenue: number, costOfSales: number): number | null {
  if (revenue === 0) return null;
  return ((revenue - costOfSales) / revenue) * 100;
}

/**
 * EBITDA Margin %
 * Formula: (EBITDA / Revenue) × 100
 */
export function calculateEBITDAMargin(ebitda: number, revenue: number): number | null {
  if (revenue === 0) return null;
  return (ebitda / revenue) * 100;
}

/**
 * EBIT Margin %
 * Formula: (EBIT / Revenue) × 100
 */
export function calculateEBITMargin(ebit: number, revenue: number): number | null {
  if (revenue === 0) return null;
  return (ebit / revenue) * 100;
}

/**
 * Net Margin %
 * Formula: (Net Income / Revenue) × 100
 */
export function calculateNetMargin(netIncome: number, revenue: number): number | null {
  if (revenue === 0) return null;
  return (netIncome / revenue) * 100;
}

// ============================================================================
// ACTIVITY RATIOS (Sheet 2.4, Rows 63+)
// ============================================================================

/**
 * Asset Turnover (Rotación de Activos)
 * Formula: Revenue / Total Assets
 */
export function calculateAssetTurnover(revenue: number, totalAssets: number): number | null {
  if (totalAssets === 0) return null;
  return revenue / totalAssets;
}

/**
 * Inventory Turnover (based on Cost)
 * Formula: Cost of Sales / Inventory
 * Sheet 2.4, Row 71 → CalcBal!K163
 * Value: 16.09745157780196
 */
export function calculateInventoryTurnoverCost(costOfSales: number, inventory: number): number | null {
  if (inventory === 0) return null;
  return costOfSales / inventory;
}

/**
 * Inventory Turnover (based on Sales)
 * Formula: Revenue / Inventory
 * Sheet 2.4, Row 72 → CalcBal!K165
 * Value: 38.6792513601741
 */
export function calculateInventoryTurnoverSales(revenue: number, inventory: number): number | null {
  if (inventory === 0) return null;
  return revenue / inventory;
}

/**
 * Days Sales Outstanding (Plazo Medio de Cobro)
 * Formula: (Accounts Receivable / Revenue) × 365
 */
export function calculateDaysSalesOutstanding(accountsReceivable: number, revenue: number): number | null {
  if (revenue === 0) return null;
  return (accountsReceivable / revenue) * 365;
}

/**
 * Days Payable Outstanding (Plazo Medio de Pago)
 * Formula: (Accounts Payable / Cost of Sales) × 365
 */
export function calculateDaysPayableOutstanding(accountsPayable: number, costOfSales: number): number | null {
  if (costOfSales === 0) return null;
  return (accountsPayable / costOfSales) * 365;
}

/**
 * Days Inventory Outstanding (Días de Inventario)
 * Formula: (Inventory / Cost of Sales) × 365
 */
export function calculateDaysInventoryOutstanding(inventory: number, costOfSales: number): number | null {
  if (costOfSales === 0) return null;
  return (inventory / costOfSales) * 365;
}

/**
 * Cash Conversion Cycle (Ciclo de Caja)
 * Formula: DSO + DIO - DPO
 */
export function calculateCashConversionCycle(
  accountsReceivable: number,
  inventory: number,
  accountsPayable: number,
  revenue: number,
  costOfSales: number
): number | null {
  const dso = calculateDaysSalesOutstanding(accountsReceivable, revenue);
  const dio = calculateDaysInventoryOutstanding(inventory, costOfSales);
  const dpo = calculateDaysPayableOutstanding(accountsPayable, costOfSales);

  if (dso === null || dio === null || dpo === null) return null;
  return dso + dio - dpo;
}

// ============================================================================
// RISK ANALYSIS (Sheet 2.5)
// ============================================================================

/**
 * Altman Z-Score (for non-public companies)
 * Formula: Z = 0.717*X1 + 0.847*X2 + 3.107*X3 + 0.420*X4 + 0.998*X5
 * Where:
 *   X1 = Working Capital / Total Assets
 *   X2 = Retained Earnings / Total Assets
 *   X3 = EBIT / Total Assets
 *   X4 = Equity / Total Liabilities
 *   X5 = Revenue / Total Assets
 *
 * Interpretation:
 *   Z > 2.9: Safe zone
 *   1.23 < Z < 2.9: Gray zone
 *   Z < 1.23: Distress zone
 */
export function calculateAltmanZScore(
  workingCapital: number,
  retainedEarnings: number,
  ebit: number,
  equity: number,
  totalAssets: number,
  totalLiabilities: number,
  revenue: number
): number | null {
  if (totalAssets === 0 || totalLiabilities === 0) return null;

  const X1 = workingCapital / totalAssets;
  const X2 = retainedEarnings / totalAssets;
  const X3 = ebit / totalAssets;
  const X4 = equity / totalLiabilities;
  const X5 = revenue / totalAssets;

  const Z = 0.717 * X1 + 0.847 * X2 + 3.107 * X3 + 0.420 * X4 + 0.998 * X5;

  return Z;
}

/**
 * Springate S-Score
 * Formula: S = 1.03*A + 3.07*B + 0.66*C + 0.4*D
 * Where:
 *   A = Working Capital / Total Assets
 *   B = EBIT / Total Assets
 *   C = EBT / Current Liabilities
 *   D = Revenue / Total Assets
 *
 * Interpretation:
 *   S > 0.862: Healthy company
 *   S < 0.862: Company at risk
 */
export function calculateSpringateScore(
  workingCapital: number,
  ebit: number,
  ebt: number,
  revenue: number,
  totalAssets: number,
  currentLiabilities: number
): number | null {
  if (totalAssets === 0 || currentLiabilities === 0) return null;

  const A = workingCapital / totalAssets;
  const B = ebit / totalAssets;
  const C = ebt / currentLiabilities;
  const D = revenue / totalAssets;

  const S = 1.03 * A + 3.07 * B + 0.66 * C + 0.4 * D;

  return S;
}

// ============================================================================
// PRODUCTIVITY RATIOS
// ============================================================================

/**
 * Revenue per Employee (Ventas por Empleado)
 */
export function calculateRevenuePerEmployee(revenue: number, employees: number): number | null {
  if (employees === 0) return null;
  return revenue / employees;
}

/**
 * EBITDA per Employee
 */
export function calculateEBITDAPerEmployee(ebitda: number, employees: number): number | null {
  if (employees === 0) return null;
  return ebitda / employees;
}

/**
 * Net Income per Employee
 */
export function calculateNetIncomePerEmployee(netIncome: number, employees: number): number | null {
  if (employees === 0) return null;
  return netIncome / employees;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safe division - returns null if denominator is 0
 */
export function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Format number or return "n/d" for null values
 */
export function formatRatio(value: number | null, decimals: number = 2): string {
  if (value === null) return 'n/d';
  return value.toFixed(decimals);
}
