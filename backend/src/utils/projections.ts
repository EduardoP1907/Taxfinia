/**
 * Utilidades para cálculos de proyecciones financieras (Hoja 4.1 del Excel)
 *
 * Estas funciones implementan las fórmulas de crecimiento y cálculos derivados
 * que se utilizan en la proyección financiera a 10 años.
 */

// ==================== FORMULAS DE CRECIMIENTO ====================

/**
 * Aplica tasa de crecimiento al valor base (año histórico)
 * Formula Excel: =SI(I39=0, $G11, ($G11*I39)+$G11)
 * Traducción: SI(tasa=0, base, base*(1+tasa))
 *
 * @param baseValue - Valor del año base histórico
 * @param growthRate - Tasa de crecimiento (decimal, ej: 0.05 = 5%)
 * @returns Valor proyectado o base si no hay crecimiento
 */
export function applyGrowthRateFromBase(
  baseValue: number,
  growthRate: number | null | undefined
): number {
  // Si no hay tasa de crecimiento o es 0, usar valor base
  if (growthRate === null || growthRate === undefined || growthRate === 0) {
    return baseValue;
  }

  // Aplicar crecimiento: base * (1 + tasa)
  return baseValue * (1 + growthRate);
}

/**
 * Aplica tasa de crecimiento al valor del año anterior
 * Formula Excel: =SI(J39=0, I11, (I11*J39)+I11)
 * Traducción: SI(tasa=0, valorAnterior, valorAnterior*(1+tasa))
 *
 * @param priorYearValue - Valor del año anterior
 * @param growthRate - Tasa de crecimiento (decimal)
 * @returns Valor proyectado o anterior si no hay crecimiento
 */
export function applyGrowthRateFromPriorYear(
  priorYearValue: number,
  growthRate: number | null | undefined
): number {
  // Si no hay tasa de crecimiento o es 0, usar valor anterior
  if (growthRate === null || growthRate === undefined || growthRate === 0) {
    return priorYearValue;
  }

  // Aplicar crecimiento: anterior * (1 + tasa)
  return priorYearValue * (1 + growthRate);
}

/**
 * Aplicar tasa de crecimiento desde el año base (como en Excel)
 * Fórmula Excel: SI(tasa=0; baseValue; (baseValue*tasa)+baseValue)
 * Equivalente: baseValue * (1 + tasa)
 */
export function applyGrowthRateFromBaseYear(
  baseYearValue: number,
  growthRate: number | null | undefined
): number {
  // Si no hay tasa de crecimiento o es 0, usar valor del año base
  if (growthRate === null || growthRate === undefined || growthRate === 0) {
    return baseYearValue;
  }

  // Aplicar crecimiento desde el año base: base * (1 + tasa)
  return baseYearValue * (1 + growthRate);
}

// ==================== CALCULOS DE RESULTADOS (INCOME STATEMENT) ====================

/**
 * Calcula EBITDA según Hoja 4.1 del Excel
 * Formula Excel G15: = G13 - G14
 * Donde:
 * - G13 = Margen Bruto = Revenue - CostOfSales
 * - G14 = Gastos de explotación
 * Resultado: EBITDA = (Revenue - CostOfSales) - OtherOperatingExpenses
 *
 * @param revenue - Ingresos por ventas
 * @param costOfSales - Coste de las ventas
 * @param otherOperatingExpenses - Otros gastos de explotación (SIN incluir depreciación)
 */
export function calculateEBITDA(
  revenue: number,
  costOfSales: number,
  otherOperatingExpenses: number
): number {
  const margenBruto = revenue - costOfSales;
  return margenBruto - otherOperatingExpenses;
}

/**
 * Calcula Resultado Explotación (Operating Result)
 * Formula Excel i17: EBITDA - Depreciación (SIN excepcionales)
 *
 * @param ebitda - EBITDA calculado
 * @param depreciation - Depreciaciones
 */
export function calculateOperatingResult(
  ebitda: number,
  depreciation: number
): number {
  return ebitda - depreciation;
}

/**
 * Calcula EBIT (Earnings Before Interest & Taxes)
 * Formula Excel i19: Resultado Explotación + Excepcionales Netos
 *
 * @param operatingResult - Resultado Explotación
 * @param exceptionalNet - Resultado excepcional neto
 */
export function calculateEBIT(
  operatingResult: number,
  exceptionalNet: number
): number {
  return operatingResult + exceptionalNet;
}

/**
 * Calcula Resultado Financiero Neto
 * Formula: Financieros Netos = Ingresos Financieros - Gastos Financieros
 *
 * @param financialIncome - Ingresos financieros
 * @param financialExpenses - Gastos financieros
 */
export function calculateFinancialNet(
  financialIncome: number,
  financialExpenses: number
): number {
  return financialIncome - financialExpenses;
}

/**
 * Calcula EBT (Earnings Before Tax) / B.A.I. (Beneficio antes de impuestos)
 * Formula: EBT = EBIT + Financieros Netos
 *
 * @param ebit - EBIT (Beneficio operativo)
 * @param financialNet - Resultado financiero neto
 */
export function calculateEBT(
  ebit: number,
  financialNet: number
): number {
  return ebit + financialNet;
}

/**
 * Calcula Impuesto sobre Beneficios
 * Formula: Impuesto = EBT * Tasa Impositiva
 *
 * @param ebt - Beneficio antes de impuestos
 * @param taxRate - Tasa impositiva (decimal, ej: 0.25 = 25%)
 */
export function calculateIncomeTax(
  ebt: number,
  taxRate: number
): number {
  // Si EBT es negativo, no hay impuesto
  if (ebt <= 0) return 0;

  return ebt * taxRate;
}

/**
 * Calcula Beneficio Neto (Net Income)
 * Formula: Beneficio Neto = EBT - Impuestos
 *
 * @param ebt - Beneficio antes de impuestos
 * @param incomeTax - Impuesto sobre beneficios
 */
export function calculateNetIncome(
  ebt: number,
  incomeTax: number
): number {
  return ebt - incomeTax;
}

/**
 * Calcula NOPAT (Net Operating Profit After Tax)
 * Formula: NOPAT = EBIT * (1 - Tasa Impositiva)
 *
 * @param ebit - EBIT (Beneficio operativo)
 * @param taxRate - Tasa impositiva (decimal)
 */
export function calculateNOPAT(
  ebit: number,
  taxRate: number
): number {
  return ebit * (1 - taxRate);
}

// ==================== CALCULOS DE FLUJO DE CAJA ====================

/**
 * Calcula Flujo de Caja Bruto
 * Formula: Flujo Bruto = NOPAT + Depreciación
 * (Se suma depreciación porque es un gasto no monetario)
 *
 * @param nopat - NOPAT calculado
 * @param depreciation - Depreciaciones
 */
export function calculateGrossCashFlow(
  nopat: number,
  depreciation: number
): number {
  return nopat + depreciation;
}

/**
 * Calcula Free Cash Flow según Hoja 4.1 del Excel
 * Formula Excel G36: = G20 - G35
 * Donde:
 * - G20 = NOPAT
 * - G35 = Inversión Neta = '2.2'!H19-'2.2'!J19 (Total Activo año N - Total Activo año N-1)
 *
 * Formula: FCF = NOPAT - (Total Activo Actual - Total Activo Anterior)
 *          FCF = NOPAT - ∆Total Activo
 *
 * IMPORTANTE: El cambio en Total Activo puede ser NEGATIVO (si los activos disminuyen),
 * lo que AUMENTA el FCF porque la empresa está liberando efectivo.
 *
 * @param nopat - NOPAT (Net Operating Profit After Tax)
 * @param totalAssetsCurrent - Total Activo del año actual
 * @param totalAssetsPrior - Total Activo del año anterior
 * @returns Free Cash Flow
 */
export function calculateFreeCashFlow(
  nopat: number,
  totalAssetsCurrent: number,
  totalAssetsPrior: number
): number {
  const netInvestment = totalAssetsCurrent - totalAssetsPrior;
  return nopat - netInvestment;
}

// ==================== RATIOS DE RENTABILIDAD ====================

/**
 * Calcula ROA (Return on Assets) - Rentabilidad Económica
 * Formula Excel i26: ROA = (i17 / i7)
 * Donde i17 = Resultado Explotación (EBITDA - Depreciation, SIN excepcionales)
 *       i7 = Total Activo
 *
 * @param operatingResult - Resultado Explotación
 * @param totalAssets - Total Activo
 * @returns ROA (sin multiplicar por 100, el Excel lo muestra como decimal)
 */
export function calculateROA(
  operatingResult: number,
  totalAssets: number
): number | null {
  if (totalAssets === 0) return null;
  return operatingResult / totalAssets;
}

/**
 * Calcula ROE (Return on Equity) - Rentabilidad Financiera
 * Formula Excel i28: ROE = (i24 / i8)
 * Donde i24 = Beneficio Neto
 *       i8 = Patrimonio Neto
 *
 * @param netIncome - Beneficio Neto
 * @param equity - Patrimonio Neto
 * @returns ROE (sin multiplicar por 100, el Excel lo muestra como decimal)
 */
export function calculateROE(
  netIncome: number,
  equity: number
): number | null {
  if (equity === 0) return null;
  return netIncome / equity;
}

// ==================== RATIOS DE RIESGO Y APALANCAMIENTO ====================

/**
 * Calcula Apalancamiento Financiero
 * Formula Excel i29: (i7/i8) × (i22/i17)
 * Donde i7 = Total Activo
 *       i8 = Patrimonio Neto
 *       i22 = EBT
 *       i17 = Resultado Explotación
 *
 * @param totalAssets - Total Activo
 * @param equity - Patrimonio Neto
 * @param ebt - EBT (Beneficio antes de impuestos)
 * @param operatingResult - Resultado Explotación
 * @returns Apalancamiento Financiero o null si hay división por cero
 */
export function calculateFinancialLeverage(
  totalAssets: number,
  equity: number,
  ebt: number,
  operatingResult: number
): number | null {
  if (equity === 0 || operatingResult === 0) return null;
  return (totalAssets / equity) * (ebt / operatingResult);
}

/**
 * Calcula Riesgo Operativo
 * Formula Excel i27: (i33/i17) / (i32/i11)
 * Donde i33 = Variación Resultado Explotación %
 *       i17 = Resultado Explotación
 *       i32 = Variación Ventas %
 *       i11 = Revenue
 *
 * @param operatingResultVariation - Variación Resultado Explotación % (decimal)
 * @param operatingResult - Resultado Explotación
 * @param revenueVariation - Variación Ventas % (decimal)
 * @param revenue - Ingresos por Ventas
 * @returns Riesgo Operativo o null si hay división por cero
 */
export function calculateOperationalRisk(
  operatingResultVariation: number,
  operatingResult: number,
  revenueVariation: number,
  revenue: number
): number | null {
  if (operatingResult === 0 || revenue === 0 || revenueVariation === 0) return null;
  return (operatingResultVariation / operatingResult) / (revenueVariation / revenue);
}

/**
 * Calcula Riesgo Financiero
 * Formula Excel i30: (i34/i22) / (i33/i17)
 * Donde i34 = Variación BAI %
 *       i22 = EBT
 *       i33 = Variación Resultado Explotación %
 *       i17 = Resultado Explotación
 *
 * @param ebtVariation - Variación BAI % (decimal)
 * @param ebt - EBT (Beneficio antes de impuestos)
 * @param operatingResultVariation - Variación Resultado Explotación % (decimal)
 * @param operatingResult - Resultado Explotación
 * @returns Riesgo Financiero o null si hay división por cero
 */
export function calculateFinancialRisk(
  ebtVariation: number,
  ebt: number,
  operatingResultVariation: number,
  operatingResult: number
): number | null {
  if (ebt === 0 || operatingResult === 0 || operatingResultVariation === 0) return null;
  return (ebtVariation / ebt) / (operatingResultVariation / operatingResult);
}

// ==================== FUNCIONES HELPER ====================

/**
 * Convierte un porcentaje a decimal
 * @param percentage - Porcentaje (ej: 5.5 para 5.5%)
 * @returns Decimal (ej: 0.055)
 */
export function percentageToDecimal(percentage: number): number {
  return percentage / 100;
}

/**
 * Convierte un decimal a porcentaje
 * @param decimal - Decimal (ej: 0.055)
 * @returns Porcentaje (ej: 5.5)
 */
export function decimalToPercentage(decimal: number): number {
  return decimal * 100;
}

/**
 * Redondea un número a N decimales
 * @param value - Valor a redondear
 * @param decimals - Número de decimales (default: 2)
 */
export function roundToDecimals(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
