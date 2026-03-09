/**
 * Utilidades para cálculos de valoración por DCF (Hoja 4.3 del Excel)
 *
 * Estas funciones implementan el método de Flujo de Caja Descontado (Discounted Cash Flow)
 * para valoración de empresas.
 */

// ==================== CÁLCULO DEL WACC ====================

/**
 * Calcula el coste del capital propio (Ke) usando CAPM
 * Formula: Ke = Rf + β × (Rm - Rf)
 * Donde:
 * - Rf = Tasa libre de riesgo
 * - β = Beta de la empresa
 * - Rm - Rf = Prima de riesgo de mercado
 *
 * @param riskFreeRate - Tasa libre de riesgo (decimal, ej: 0.025 = 2.5%)
 * @param beta - Beta de la empresa
 * @param marketRiskPremium - Prima de riesgo de mercado (decimal, ej: 0.06 = 6%)
 * @returns Coste del capital propio (decimal)
 */
export function calculateCostOfEquity(
  riskFreeRate: number,
  beta: number,
  marketRiskPremium: number
): number {
  return riskFreeRate + (beta * marketRiskPremium);
}

/**
 * Calcula el WACC (Weighted Average Cost of Capital)
 * Formula: WACC = (E/V × Ke) + (D/V × Kd × (1 - T))
 * Donde:
 * - E = Valor del Patrimonio Neto
 * - D = Valor de la Deuda
 * - V = E + D (Valor total de la empresa)
 * - Ke = Coste del capital propio
 * - Kd = Coste de la deuda
 * - T = Tasa impositiva
 *
 * @param equity - Patrimonio Neto
 * @param debt - Deuda total
 * @param costOfEquity - Ke
 * @param costOfDebt - Kd
 * @param taxRate - Tasa impositiva (decimal)
 * @returns WACC (decimal)
 */
export function calculateWACC(
  equity: number,
  debt: number,
  costOfEquity: number,
  costOfDebt: number,
  taxRate: number
): number | null {
  const totalValue = equity + debt;

  if (totalValue === 0) return null;

  const weightEquity = equity / totalValue;
  const weightDebt = debt / totalValue;

  return (weightEquity * costOfEquity) + (weightDebt * costOfDebt * (1 - taxRate));
}

// ==================== DESCUENTO DE FLUJOS ====================

/**
 * Calcula el factor de descuento para un año dado
 * Formula: Factor = 1 / (1 + WACC)^año
 *
 * @param wacc - WACC (decimal)
 * @param year - Número de año (1, 2, 3, ...)
 * @returns Factor de descuento
 */
export function calculateDiscountFactor(
  wacc: number,
  year: number
): number {
  return 1 / Math.pow(1 + wacc, year);
}

/**
 * Calcula el Valor Presente de un Free Cash Flow
 * Formula: VP = FCF / (1 + WACC)^año
 *
 * @param fcf - Free Cash Flow
 * @param wacc - WACC (decimal)
 * @param year - Número de año (1, 2, 3, ...)
 * @returns Valor Presente del FCF
 */
export function calculatePVOfFCF(
  fcf: number,
  wacc: number,
  year: number
): number {
  return fcf / Math.pow(1 + wacc, year);
}

/**
 * Calcula el Valor Presente de todos los FCFs proyectados
 *
 * @param fcfs - Array de Free Cash Flows proyectados
 * @param wacc - WACC (decimal)
 * @returns Suma de todos los valores presentes
 */
export function calculateSumPVOfFCFs(
  fcfs: number[],
  wacc: number
): number {
  let sum = 0;

  for (let i = 0; i < fcfs.length; i++) {
    const year = i + 1;
    const pv = calculatePVOfFCF(fcfs[i], wacc, year);
    sum += pv;
  }

  return sum;
}

// ==================== VALOR TERMINAL ====================

/**
 * Calcula el Valor Terminal usando el modelo de crecimiento perpetuo (Gordon Growth)
 * Formula: VT = FCF_último × (1 + g) / (WACC - g)
 * Donde:
 * - FCF_último = Free Cash Flow del último año proyectado
 * - g = Tasa de crecimiento perpetuo
 * - WACC = Weighted Average Cost of Capital
 *
 * @param lastFCF - FCF del último año proyectado
 * @param wacc - WACC (decimal)
 * @param perpetualGrowthRate - Tasa de crecimiento perpetuo (decimal, ej: 0.02 = 2%)
 * @returns Valor Terminal
 * @throws Error si WACC <= perpetualGrowthRate
 */
export function calculateTerminalValue(
  lastFCF: number,
  wacc: number,
  perpetualGrowthRate: number
): number {
  if (wacc <= perpetualGrowthRate) {
    throw new Error('WACC debe ser mayor que la tasa de crecimiento perpetuo');
  }

  return (lastFCF * (1 + perpetualGrowthRate)) / (wacc - perpetualGrowthRate);
}

/**
 * Calcula el Valor Presente del Valor Terminal
 * Formula: VP_VT = VT / (1 + WACC)^N
 * Donde N = número de años de proyección
 *
 * @param terminalValue - Valor Terminal
 * @param wacc - WACC (decimal)
 * @param projectionYears - Número de años proyectados
 * @returns Valor Presente del Valor Terminal
 */
export function calculatePVOfTerminalValue(
  terminalValue: number,
  wacc: number,
  projectionYears: number
): number {
  return terminalValue / Math.pow(1 + wacc, projectionYears);
}

// ==================== VALORACIÓN FINAL ====================

/**
 * Calcula el Enterprise Value
 * Formula: EV = VP de FCFs + VP del Valor Terminal
 *
 * @param sumPvOfFCFs - Suma de todos los valores presentes de los FCFs
 * @param pvOfTerminalValue - Valor presente del Valor Terminal
 * @returns Enterprise Value
 */
export function calculateEnterpriseValue(
  sumPvOfFCFs: number,
  pvOfTerminalValue: number
): number {
  return sumPvOfFCFs + pvOfTerminalValue;
}

/**
 * Calcula el Equity Value (Valor para accionistas)
 * Formula: Equity Value = Enterprise Value - Deuda Neta
 * Donde: Deuda Neta = Deuda Total - Caja
 *
 * @param enterpriseValue - Enterprise Value
 * @param netDebt - Deuda neta
 * @returns Equity Value
 */
export function calculateEquityValue(
  enterpriseValue: number,
  netDebt: number
): number {
  return enterpriseValue - netDebt;
}

/**
 * Calcula el Valor por Acción
 * Formula: Valor por Acción = Equity Value / Acciones en Circulación
 *
 * @param equityValue - Equity Value
 * @param sharesOutstanding - Número de acciones en circulación
 * @returns Valor por acción
 */
export function calculateValuePerShare(
  equityValue: number,
  sharesOutstanding: number
): number | null {
  if (sharesOutstanding === 0) return null;
  return equityValue / sharesOutstanding;
}

// ==================== FUNCIÓN COMPLETA DE VALORACIÓN DCF ====================

export interface DCFInputs {
  // Parámetros de WACC
  equity: number;
  debt: number;
  riskFreeRate: number;
  beta: number;
  marketRiskPremium: number;
  costOfDebt: number;
  taxRate: number;

  // Si se proporciona, se usa directamente (no se recalcula desde CAPM)
  precomputedWacc?: number;

  // Proyecciones
  fcfs: number[]; // Array de Free Cash Flows proyectados

  // Parámetros de valoración
  perpetualGrowthRate: number;
  netDebt: number;
  sharesOutstanding: number;
}

export interface DCFResults {
  // WACC
  costOfEquity: number;
  wacc: number;

  // Valores presentes
  pvFCFs: { year: number; fcf: number; discountFactor: number; pvOfFCF: number }[];
  sumPvOfFCFs: number;

  // Valor Terminal
  terminalValue: number;
  pvOfTerminalValue: number;

  // Valoración final
  enterpriseValue: number;
  equityValue: number;
  valuePerShare: number | null;
}

/**
 * Realiza una valoración completa por el método DCF
 *
 * @param inputs - Parámetros de entrada para DCF
 * @returns Resultados completos de la valoración
 */
export function performDCFValuation(inputs: DCFInputs): DCFResults {
  let costOfEquity: number;
  let wacc: number;

  if (inputs.precomputedWacc !== undefined && inputs.precomputedWacc > 0) {
    // Usar el WACC ingresado directamente por el usuario
    wacc = inputs.precomputedWacc;
    costOfEquity = calculateCostOfEquity(
      inputs.riskFreeRate || 0.025,
      inputs.beta || 1.0,
      inputs.marketRiskPremium || 0.06
    );
  } else {
    // 1. Calcular Ke (Coste del Capital Propio) desde CAPM
    costOfEquity = calculateCostOfEquity(
      inputs.riskFreeRate,
      inputs.beta,
      inputs.marketRiskPremium
    );

    // 2. Calcular WACC desde componentes
    const calculatedWacc = calculateWACC(
      inputs.equity,
      inputs.debt,
      costOfEquity,
      inputs.costOfDebt,
      inputs.taxRate
    );

    if (calculatedWacc === null) {
      throw new Error('No se puede calcular WACC: Equity + Debt = 0');
    }

    wacc = calculatedWacc;
  }

  // 3. Calcular VP de cada FCF
  const pvFCFs = inputs.fcfs.map((fcf, index) => {
    const year = index + 1;
    const discountFactor = calculateDiscountFactor(wacc, year);
    const pvOfFCF = calculatePVOfFCF(fcf, wacc, year);

    return {
      year,
      fcf,
      discountFactor,
      pvOfFCF,
    };
  });

  // 4. Suma de VP de FCFs
  const sumPvOfFCFs = pvFCFs.reduce((sum, item) => sum + item.pvOfFCF, 0);

  // 5. Calcular Valor Terminal
  const lastFCF = inputs.fcfs[inputs.fcfs.length - 1];
  const terminalValue = calculateTerminalValue(
    lastFCF,
    wacc,
    inputs.perpetualGrowthRate
  );

  // 6. VP del Valor Terminal
  const pvOfTerminalValue = calculatePVOfTerminalValue(
    terminalValue,
    wacc,
    inputs.fcfs.length
  );

  // 7. Enterprise Value
  const enterpriseValue = calculateEnterpriseValue(sumPvOfFCFs, pvOfTerminalValue);

  // 8. Equity Value
  const equityValue = calculateEquityValue(enterpriseValue, inputs.netDebt);

  // 9. Valor por Acción
  const valuePerShare = calculateValuePerShare(equityValue, inputs.sharesOutstanding);

  return {
    costOfEquity,
    wacc,
    pvFCFs,
    sumPvOfFCFs,
    terminalValue,
    pvOfTerminalValue,
    enterpriseValue,
    equityValue,
    valuePerShare,
  };
}
