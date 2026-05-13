import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface FinancialDataForAI {
  company: {
    name: string;
    taxId?: string;
    industry?: string;
    businessActivity?: string;
    country?: string;
    currency?: string;
  };
  years: number[];
  latestYear: number;
  incomeData: {
    [year: number]: {
      revenue: number;
      costOfSales: number;
      grossMargin: number;
      grossMarginPct: number;
      adminExpenses: number;
      ebitda: number;
      ebitdaPct: number;
      depreciation: number;
      operatingResult: number;
      operatingResultPct: number;
      exceptionalResult: number;
      financialResult: number;
      ebt: number;
      ebtPct: number;
      incomeTax: number;
      netIncome: number;
      netMarginPct: number;
    };
  };
  balanceData: {
    [year: number]: {
      totalAssets: number;
      nonCurrentAssets: number;
      currentAssets: number;
      inventory: number;
      accountsReceivable: number;
      cash: number;
      equity: number;
      nonCurrentLiabilities: number;
      currentLiabilities: number;
      totalDebt: number;
      workingCapital: number;
    };
  };
  ratiosData: {
    [year: number]: {
      currentRatio?: number | null;
      quickRatio?: number | null;
      cashRatio?: number | null;
      debtToEquity?: number | null;
      debtToAssets?: number | null;
      debtToEbitda?: number | null;
      roe?: number | null;
      roa?: number | null;
      grossMargin?: number | null;
      ebitdaMargin?: number | null;
      netMargin?: number | null;
      assetTurnover?: number | null;
      daysSalesOutstanding?: number | null;
      daysPayableOutstanding?: number | null;
      altmanZScore?: number | null;
    };
  };
  dcfData?: {
    wacc?: number | null;
    equityValue?: number | null;
    terminalGrowthRate?: number | null;
  };
}

export interface AIAnalysisResult {
  executiveSummary: string;
  incomeAnalysis: string;
  balanceAnalysis: string;
  financingAnalysis: string;
  investmentAnalysis: string;
  liquidityAnalysis: string;
  rotationAnalysis: string;
  solvencyAnalysis: string;
  valuationAnalysis: string;
  trendAnalysis: string;
  consistencyAlerts: string;
  strategicAlerts: string;
  prioritizedRecommendations: string;
}

// ─── Formatting helpers ────────────────────────────────────────────────────────

function formatAmount(value: number, currency: string): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (currency === 'CLP') {
    if (abs >= 1_000_000_000_000) return `${sign}MM$ ${(abs / 1_000_000_000_000).toFixed(2)} billones`;
    if (abs >= 1_000_000_000)     return `${sign}MM$ ${(abs / 1_000_000_000).toFixed(1)}`;
    if (abs >= 1_000_000)         return `${sign}M$ ${(abs / 1_000_000).toFixed(1)}`;
    return `${sign}$ ${abs.toLocaleString('es-CL')}`;
  }
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}B ${currency}`;
  if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toFixed(1)}M ${currency}`;
  return `${sign}${abs.toLocaleString('es-CL')} ${currency}`;
}

function pct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

function growthLabel(current: number, previous: number): string {
  if (!previous || previous === 0) return 'N/D';
  const g = ((current - previous) / Math.abs(previous)) * 100;
  const arrow = g > 0 ? '▲' : g < 0 ? '▼' : '—';
  return `${arrow} ${Math.abs(g).toFixed(1)}%`;
}

function nd(val: number | null | undefined, decimals = 2): string {
  return val != null ? val.toFixed(decimals) : 'N/D';
}

// ─── Build trend table for all available years ────────────────────────────────

function buildMultiYearTable(data: FinancialDataForAI): string {
  const cur = data.company.currency || 'CLP';
  const sortedYears = [...data.years].sort((a, b) => a - b);

  let table = `\n╔═══ TABLA COMPARATIVA MULTIANUAL (${sortedYears.join(' | ')}) ═══╗\n`;

  // Income metrics
  table += '\n--- ESTADO DE RESULTADOS ---\n';
  table += `Año:             ${sortedYears.map(y => String(y).padStart(12)).join('')}\n`;

  const metrics: { label: string; getValue: (y: number) => number | undefined }[] = [
    { label: 'Ingresos Ventas', getValue: y => data.incomeData[y]?.revenue },
    { label: 'Margen Bruto',    getValue: y => data.incomeData[y]?.grossMargin },
    { label: 'EBITDA',          getValue: y => data.incomeData[y]?.ebitda },
    { label: 'Res. Explotación',getValue: y => data.incomeData[y]?.operatingResult },
    { label: 'Resultado Neto',  getValue: y => data.incomeData[y]?.netIncome },
  ];

  for (const m of metrics) {
    const values = sortedYears.map(y => m.getValue(y) ?? 0);
    table += `${m.label.padEnd(17)}${values.map(v => formatAmount(v, cur).padStart(12)).join('')}\n`;
  }

  table += '\n--- PORCENTAJES SOBRE VENTAS ---\n';
  const pctMetrics: { label: string; getValue: (y: number) => number | undefined }[] = [
    { label: 'Margen Bruto %',  getValue: y => data.incomeData[y]?.grossMarginPct },
    { label: 'EBITDA %',        getValue: y => data.incomeData[y]?.ebitdaPct },
    { label: 'Margen Neto %',   getValue: y => data.incomeData[y]?.netMarginPct },
  ];
  for (const m of pctMetrics) {
    const values = sortedYears.map(y => m.getValue(y) ?? 0);
    table += `${m.label.padEnd(17)}${values.map(v => pct(v).padStart(12)).join('')}\n`;
  }

  // Balance metrics
  table += '\n--- BALANCE ---\n';
  const balMetrics: { label: string; getValue: (y: number) => number | undefined }[] = [
    { label: 'Total Activo',    getValue: y => data.balanceData[y]?.totalAssets },
    { label: 'Patrimonio Neto', getValue: y => data.balanceData[y]?.equity },
    { label: 'Deuda Total',     getValue: y => data.balanceData[y]?.totalDebt },
    { label: 'Fondo Maniobra',  getValue: y => data.balanceData[y]?.workingCapital },
  ];
  for (const m of balMetrics) {
    const values = sortedYears.map(y => m.getValue(y) ?? 0);
    table += `${m.label.padEnd(17)}${values.map(v => formatAmount(v, cur).padStart(12)).join('')}\n`;
  }

  // Key ratios
  table += '\n--- RATIOS CLAVE ---\n';
  const ratioMetrics: { label: string; getValue: (y: number) => number | null | undefined }[] = [
    { label: 'Liquidez Gral.',  getValue: y => data.ratiosData[y]?.currentRatio },
    { label: 'Deuda/EBITDA',    getValue: y => data.ratiosData[y]?.debtToEbitda },
    { label: 'ROE',             getValue: y => data.ratiosData[y]?.roe ?? null },
    { label: 'ROA',             getValue: y => data.ratiosData[y]?.roa ?? null },
    { label: 'Altman Z-Score',  getValue: y => data.ratiosData[y]?.altmanZScore },
  ];
  for (const m of ratioMetrics) {
    const values = sortedYears.map(y => m.getValue(y));
    table += `${m.label.padEnd(17)}${values.map(v => nd(v).padStart(12)).join('')}\n`;
  }

  // Growth rates vs previous year
  if (sortedYears.length >= 2) {
    table += '\n--- VARIACIONES INTERANUALES ---\n';
    for (let i = 1; i < sortedYears.length; i++) {
      const yr = sortedYears[i];
      const yp = sortedYears[i - 1];
      const revCurr = data.incomeData[yr]?.revenue ?? 0;
      const revPrev = data.incomeData[yp]?.revenue ?? 0;
      const ebitdaCurr = data.incomeData[yr]?.ebitda ?? 0;
      const ebitdaPrev = data.incomeData[yp]?.ebitda ?? 0;
      const netCurr = data.incomeData[yr]?.netIncome ?? 0;
      const netPrev = data.incomeData[yp]?.netIncome ?? 0;
      table += `${yr} vs ${yp}: Ventas ${growthLabel(revCurr, revPrev)} | EBITDA ${growthLabel(ebitdaCurr, ebitdaPrev)} | Neto ${growthLabel(netCurr, netPrev)}\n`;
    }

    // CAGR if 3+ years
    if (sortedYears.length >= 3) {
      const firstYear = sortedYears[0];
      const lastYear  = sortedYears[sortedYears.length - 1];
      const n = lastYear - firstYear;
      const revFirst = data.incomeData[firstYear]?.revenue;
      const revLast  = data.incomeData[lastYear]?.revenue;
      if (revFirst && revLast && revFirst > 0 && n > 0) {
        const cagr = (Math.pow(revLast / revFirst, 1 / n) - 1) * 100;
        table += `CAGR Ventas ${firstYear}-${lastYear}: ${pct(cagr)}\n`;
      }
    }
  }

  table += '╚══════════════════════════════════════════════════════════╝\n';
  return table;
}

// ─── Build the full prompt ────────────────────────────────────────────────────

function buildFinancialPrompt(data: FinancialDataForAI): string {
  const cur = data.company.currency || 'CLP';
  const latest = data.latestYear;
  const sortedYears = [...data.years].sort((a, b) => a - b);
  const inc = data.incomeData[latest];
  const bal = data.balanceData[latest];
  const rat = data.ratiosData[latest];

  if (!inc || !bal) {
    throw new Error(`No hay datos financieros disponibles para el año ${latest}`);
  }

  const currencyLabel = cur === 'CLP' ? 'Pesos Chilenos (CLP)' :
    cur === 'USD' ? 'Dólares estadounidenses (USD)' :
    cur === 'EUR' ? 'Euros (EUR)' : cur;

  const formatInstructions = cur === 'CLP'
    ? `FORMATO DE CIFRAS CLP:
- Miles de millones (≥1.000.000.000): usar "MM$ X.X" — ejemplo: MM$ 15.0 o MM$ 180.6
- Millones (≥1.000.000): usar "M$ X.X" — ejemplo: M$ 450.3
- Menores a un millón: usar "$ X.XXX" — ejemplo: $ 890.000
- NUNCA usar "millones de dólares", "USD" ni "EUR" — la moneda es PESOS CHILENOS`
    : `FORMATO DE CIFRAS ${cur}: usar formato estándar con símbolo de moneda ${cur}`;

  const multiYearTable = buildMultiYearTable(data);
  const waccStr = data.dcfData?.wacc != null ? pct(data.dcfData.wacc * 100) : 'No disponible';
  const equityStr = data.dcfData?.equityValue != null ? formatAmount(data.dcfData.equityValue, cur) : 'No calculado';

  return `Eres PROMETHEIA, un sistema experto de gestión y control financiero orientado a directorios. Tu rol es transformar estados financieros en inteligencia estratégica, no limitarte a describir cifras.

DATOS DE LA EMPRESA:
- Nombre: ${data.company.name}
- RUT: ${data.company.taxId || 'No especificado'}
- Giro/Actividad: ${data.company.businessActivity || 'No especificado'}
- Sector/Industria: ${data.company.industry || 'No especificado'}
- País: ${data.company.country || 'No especificado'}
- Moneda de análisis: ${currencyLabel}
- Año base (análisis principal): ${latest}
- Años disponibles: ${sortedYears.join(', ')} (${sortedYears.length} ejercicio${sortedYears.length > 1 ? 's' : ''})

${formatInstructions}

${multiYearTable}

=== ESTADO DE RESULTADOS ${latest} (DETALLE) ===
- Ingresos por Ventas: ${formatAmount(inc.revenue, cur)}
- Coste de Ventas: ${formatAmount(inc.costOfSales, cur)} (${pct(inc.revenue > 0 ? inc.costOfSales / inc.revenue * 100 : 0)} de ventas)
- Margen Bruto: ${formatAmount(inc.grossMargin, cur)} (${pct(inc.grossMarginPct)}%)
- Gastos de Administración: ${formatAmount(inc.adminExpenses, cur)} (${pct(inc.revenue > 0 ? inc.adminExpenses / inc.revenue * 100 : 0)} de ventas)
- EBITDA: ${formatAmount(inc.ebitda, cur)} (margen ${pct(inc.ebitdaPct)}%)
- Depreciaciones: ${formatAmount(inc.depreciation, cur)}
- Resultado de Explotación (EBIT): ${formatAmount(inc.operatingResult, cur)} (${pct(inc.operatingResultPct)}%)
- Resultado Excepcional: ${formatAmount(inc.exceptionalResult, cur)}
- Resultado Financiero: ${formatAmount(inc.financialResult, cur)}
- Resultado Antes de Impuestos (RAI): ${formatAmount(inc.ebt, cur)} (${pct(inc.ebtPct)}%)
- Impuestos: ${formatAmount(inc.incomeTax, cur)}
- Resultado Neto: ${formatAmount(inc.netIncome, cur)} (margen neto ${pct(inc.netMarginPct)}%)

=== BALANCE ${latest} (DETALLE) ===
- Total Activo: ${formatAmount(bal.totalAssets, cur)}
  - Activo Fijo: ${formatAmount(bal.nonCurrentAssets, cur)} (${pct(bal.totalAssets > 0 ? bal.nonCurrentAssets / bal.totalAssets * 100 : 0)} del total)
  - Activo Circulante: ${formatAmount(bal.currentAssets, cur)} (${pct(bal.totalAssets > 0 ? bal.currentAssets / bal.totalAssets * 100 : 0)} del total)
    - Existencias: ${formatAmount(bal.inventory, cur)}
    - Cuentas por Cobrar: ${formatAmount(bal.accountsReceivable, cur)}
    - Tesorería/Disponible: ${formatAmount(bal.cash, cur)}
- Patrimonio Neto: ${formatAmount(bal.equity, cur)} (${pct(bal.totalAssets > 0 ? bal.equity / bal.totalAssets * 100 : 0)} del total)
- Pasivo No Circulante: ${formatAmount(bal.nonCurrentLiabilities, cur)}
- Pasivo Circulante: ${formatAmount(bal.currentLiabilities, cur)}
- Fondo de Maniobra: ${formatAmount(bal.workingCapital, cur)}

=== RATIOS FINANCIEROS ${latest} ===
LIQUIDEZ:
- Ratio Liquidez General: ${nd(rat?.currentRatio)} | Acid Test: ${nd(rat?.quickRatio)} | Disponibilidad: ${nd(rat?.cashRatio)}
ENDEUDAMIENTO:
- Deuda/Equity: ${nd(rat?.debtToEquity)} | Deuda/Activo: ${nd(rat?.debtToAssets)} | Deuda/EBITDA: ${nd(rat?.debtToEbitda)}
RENTABILIDAD:
- ROE: ${rat?.roe != null ? pct(rat.roe) : 'N/D'} | ROA: ${rat?.roa != null ? pct(rat.roa) : 'N/D'}
- Margen Bruto: ${rat?.grossMargin != null ? pct(rat.grossMargin) : 'N/D'} | Margen EBITDA: ${rat?.ebitdaMargin != null ? pct(rat.ebitdaMargin) : 'N/D'} | Margen Neto: ${rat?.netMargin != null ? pct(rat.netMargin) : 'N/D'}
EFICIENCIA:
- Rotación de Activo: ${nd(rat?.assetTurnover)} | DSO: ${nd(rat?.daysSalesOutstanding, 1)} días | DPO: ${nd(rat?.daysPayableOutstanding, 1)} días
RIESGO:
- Altman Z-Score: ${nd(rat?.altmanZScore)} ${rat?.altmanZScore != null ? (rat.altmanZScore > 2.9 ? '(Zona Segura)' : rat.altmanZScore > 1.23 ? '(Zona Gris)' : '(Zona de Alerta)') : ''}
${data.dcfData ? `
=== VALORACIÓN DCF ===
- WACC: ${waccStr}
- Tasa Crecimiento Terminal: ${data.dcfData.terminalGrowthRate != null ? pct(data.dcfData.terminalGrowthRate * 100) : 'No disponible'}
- Valor Empresa (Equity Value): ${equityStr}` : ''}

═══════════════════════════════════════════════════════════════════
INSTRUCCIONES PARA EL INFORME — PROMETHEIA SISTEMA ANALÍTICO DINÁMICO
═══════════════════════════════════════════════════════════════════

AUDIENCIA: Directorio de empresa. Perfil: toma de decisiones estratégicas, no análisis técnico detallado.

REGLAS DE FORMATO OBLIGATORIAS:
1. Cada sección: máximo 2 párrafos introductorios breves (2-3 oraciones cada uno)
2. Luego 3-5 bullets con los hallazgos clave (formato: "- Hallazgo: implicación")
3. Cerrar SIEMPRE con: "Conclusion: [una oración con el veredicto]" y "Accion recomendada: [una accion concreta]"
4. Texto plano, sin markdown, sin asteriscos, sin hashtags
5. Párrafos separados por salto de línea
6. Priorizar el IMPACTO sobre la descripción de cifras
7. Comparar con años anteriores (${sortedYears.filter(y => y !== latest).join(', ') || 'ninguno'}) SOLO cuando añada valor
8. Moneda EXCLUSIVAMENTE: ${cur} con el formato indicado

Responde ÚNICAMENTE con este JSON válido (13 claves exactas):

{
  "executiveSummary": "Párrafo 1: situación financiera actual en 2-3 oraciones. Párrafo 2: trayectoria y tendencia principal en 2-3 oraciones.\n- Fortaleza clave: [dato]\n- Principal riesgo: [dato]\n- Tendencia dominante: [dato]\nConclusion: [veredicto ejecutivo en una oración]\nAccion recomendada: [acción concreta para el directorio]",

  "incomeAnalysis": "Párrafo breve sobre evolución de ventas y márgenes. Párrafo breve sobre EBITDA y resultado neto.\n- Ventas: [evolución y CAGR si aplica]\n- Margen bruto: [tendencia]\n- EBITDA: [valor y margen]\n- Resultado neto: [valor y margen]\nConclusion: [veredicto]\nAccion recomendada: [acción concreta]",

  "balanceAnalysis": "Párrafo breve sobre estructura del activo. Párrafo breve sobre estructura financiera.\n- Activo total: [evolución]\n- Fondo de maniobra: [estado]\n- Patrimonio neto: [tendencia]\n- Endeudamiento: [nivel]\nConclusion: [veredicto]\nAccion recomendada: [acción concreta]",

  "financingAnalysis": "Párrafo breve sobre autonomía financiera y capitalización.\n- Ratio de autonomía: [valor e interpretación]\n- Calidad de la deuda: [CP vs LP]\n- Capacidad de autofinanciación: [estado]\nConclusion: [veredicto]\nAccion recomendada: [acción concreta]",

  "investmentAnalysis": "Párrafo breve sobre política de inversión y activos.\n- Activo no corriente: [evolución]\n- Política de CAPEX: [tendencia]\n- Depreciaciones: [nivel relativo]\nConclusion: [veredicto]\nAccion recomendada: [acción concreta]",

  "liquidityAnalysis": "Párrafo breve sobre posición de liquidez actual y tendencia.\n- Liquidez general: [valor vs umbral 1.0]\n- Acid test: [valor]\n- Disponibilidad: [valor]\nConclusion: [veredicto]\nAccion recomendada: [acción concreta]",

  "rotationAnalysis": "Párrafo breve sobre eficiencia operativa.\n- Días de cobro (DSO): [valor y tendencia]\n- Días de pago (DPO): [valor y tendencia]\n- Ciclo de caja: [valor e implicación]\nConclusion: [veredicto]\nAccion recomendada: [acción concreta]",

  "solvencyAnalysis": "Párrafo breve sobre capacidad de pago y apalancamiento.\n- Deuda/EBITDA: [valor vs umbral 4x]\n- Cobertura de intereses: [valor]\n- Altman Z-Score: [valor e interpretación de zona]\nConclusion: [veredicto]\nAccion recomendada: [acción concreta]",

  "valuationAnalysis": "Párrafo breve sobre valoración. Si hay WACC (${waccStr}) y equity value (${equityStr}), referenciarlos explícitamente.\n- Metodología: [DCF u otra]\n- WACC utilizado: [valor o N/D]\n- Valor estimado: [valor o N/D]\nConclusion: [veredicto]\nAccion recomendada: [acción concreta]",

  "trendAnalysis": "Párrafo breve sobre la fase de ciclo en que se encuentra la empresa.\n- CAGR ventas: [valor si aplica]\n- Dirección de márgenes: [expansión/contracción/estable]\n- Tendencia de liquidez: [mejora/deterioro/estable]\n- Tendencia de endeudamiento: [mejora/deterioro/estable]\n- Fase empresarial: [crecimiento/estabilización/deterioro/recuperación]\nConclusion: [veredicto de tendencia]\nAccion recomendada: [acción concreta]",

  "consistencyAlerts": "Párrafo breve sobre coherencia de los estados financieros.\n- [Consistencia o anomalía 1]: [descripción]\n- [Consistencia o anomalía 2]: [descripción]\nConclusion: [veredicto de confiabilidad de los datos]",

  "strategicAlerts": "MINIMO 4 alertas. Cada una en párrafo separado con formato exacto:\n[NIVEL: CRITICA/ALTA/MEDIA/BAJA] AREA: descripción del indicador, valor actual vs umbral, riesgo concreto para la empresa.",

  "prioritizedRecommendations": "MINIMO 5 recomendaciones. Cada una en párrafo separado con formato exacto:\n[PRIORIDAD: ALTA/MEDIA/BAJA] AREA EN MAYUSCULAS: accion concreta. Por que: [dato especifico que la justifica]. Impacto esperado: [resultado financiero]. Plazo: [corto/mediano/largo]."
}`;
}

// ─── Tool definition (garantiza JSON válido via tool_use) ─────────────────────

const analysisTools: Anthropic.Tool[] = [
  {
    name: 'generate_financial_report',
    description: 'Genera el informe económico-financiero completo con todos los análisis requeridos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        executiveSummary:             { type: 'string', description: '2 párrafos breves + 3 bullets + Conclusion + Accion recomendada. Orientado a directorio.' },
        incomeAnalysis:               { type: 'string', description: '2 párrafos breves + bullets de hallazgos clave + Conclusion + Accion recomendada.' },
        balanceAnalysis:              { type: 'string', description: '2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        financingAnalysis:            { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        investmentAnalysis:           { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        liquidityAnalysis:            { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        rotationAnalysis:             { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        solvencyAnalysis:             { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        valuationAnalysis:            { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada. Referenciar WACC y equity value si disponibles.' },
        trendAnalysis:                { type: 'string', description: '1 párrafo + bullets de tendencias + fase empresarial + Conclusion + Accion recomendada.' },
        consistencyAlerts:            { type: 'string', description: '1 párrafo + bullets de consistencias/anomalías + Conclusion.' },
        strategicAlerts:              { type: 'string', description: 'MINIMO 4 alertas. Formato: [NIVEL: CRITICA/ALTA/MEDIA/BAJA] AREA: indicador, valor actual, umbral, riesgo. Una por párrafo.' },
        prioritizedRecommendations:   { type: 'string', description: 'MINIMO 5 recomendaciones. Formato: [PRIORIDAD: ALTA/MEDIA/BAJA] AREA: accion. Por que: dato. Impacto: resultado. Plazo: horizonte.' },
      },
      required: [
        'executiveSummary', 'incomeAnalysis', 'balanceAnalysis', 'financingAnalysis',
        'investmentAnalysis', 'liquidityAnalysis', 'rotationAnalysis', 'solvencyAnalysis',
        'valuationAnalysis', 'trendAnalysis', 'consistencyAlerts', 'strategicAlerts',
        'prioritizedRecommendations',
      ],
    },
  },
];

// ─── WACC estimation ──────────────────────────────────────────────────────────

export interface WACCEstimateResult {
  wacc: number;           // decimal (e.g. 0.085 = 8.5%)
  costOfEquity: number;   // decimal
  costOfDebt: number;     // decimal
  debtPercentage: number; // decimal (e.g. 0.30 = 30%)
  taxRate: number;        // decimal
  terminalGrowthRate: number; // decimal
  explanation: string;
}

const waccTools: Anthropic.Tool[] = [
  {
    name: 'estimate_wacc',
    description: 'Estima el WACC de mercado para una empresa según su sector y país.',
    input_schema: {
      type: 'object' as const,
      properties: {
        wacc:               { type: 'number', description: 'WACC en decimal (ej: 0.085 para 8.5%)' },
        costOfEquity:       { type: 'number', description: 'Ke en decimal' },
        costOfDebt:         { type: 'number', description: 'Kd (antes de impuestos) en decimal' },
        debtPercentage:     { type: 'number', description: 'Proporción de deuda sobre capital total (D/V) en decimal' },
        taxRate:            { type: 'number', description: 'Tasa impositiva corporativa efectiva en decimal' },
        terminalGrowthRate: { type: 'number', description: 'Tasa de crecimiento perpetuo (g) en decimal' },
        explanation:        { type: 'string', description: 'Justificación en español del WACC estimado (3-5 oraciones): tasa libre de riesgo usada, prima de riesgo de mercado del país, beta sectorial, coste de deuda de mercado y razonamiento de la estructura de capital.' },
      },
      required: ['wacc', 'costOfEquity', 'costOfDebt', 'debtPercentage', 'taxRate', 'terminalGrowthRate', 'explanation'],
    },
  },
];

export async function estimateWACC(
  industry: string,
  country: string,
  currency: string,
  businessActivity?: string,
): Promise<WACCEstimateResult> {
  const prompt = `Eres un experto en finanzas corporativas y valoración de empresas.
Necesito que estimes el WACC (Coste Promedio Ponderado de Capital) de mercado para una empresa con las siguientes características:

- Sector / Industria: ${industry || 'No especificado'}
- Actividad comercial: ${businessActivity || 'No especificado'}
- País de origen: ${country || 'No especificado'}
- Moneda: ${currency || 'No especificado'}

Para calcular el WACC debes considerar datos actuales de mercado:
1. Tasa libre de riesgo del país (bono soberano a 10 años o equivalente)
2. Prima de riesgo de mercado del país (ERP - Equity Risk Premium de Damodaran u otras fuentes)
3. Beta desapalancada del sector (fuente: Damodaran u otras)
4. Coste de deuda típico del sector en ese país
5. Estructura de capital típica del sector (D/V y E/V)
6. Tasa impositiva corporativa efectiva del país
7. Tasa de crecimiento perpetuo (g) razonable para el sector y país

Usa tu conocimiento actualizado de parámetros de mercado para ${country || 'el país'} y el sector ${industry || 'indicado'}.

Responde usando la herramienta estimate_wacc con valores numéricos precisos y en decimal.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    tools: waccTools,
    tool_choice: { type: 'any' },
    system: 'Eres un experto en finanzas corporativas con conocimiento actualizado de tasas de mercado globales. Usa la herramienta estimate_wacc para entregar tu estimación. Todos los valores numéricos deben estar en formato decimal.',
    messages: [{ role: 'user', content: prompt }],
  });

  const toolBlock = message.content.find(b => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('La IA no pudo estimar el WACC. Intenta nuevamente.');
  }

  return toolBlock.input as WACCEstimateResult;
}

// ─── Main export function ──────────────────────────────────────────────────────

export async function generateAIAnalysis(data: FinancialDataForAI): Promise<AIAnalysisResult> {
  const prompt = buildFinancialPrompt(data);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    tools: analysisTools,
    tool_choice: { type: 'any' },
    system: 'Eres PROMETHEIA, sistema experto de control de gestión para directorios. Usa generate_financial_report. Textos en español, sin markdown ni asteriscos. Formato: párrafos breves + bullets + Conclusion + Accion recomendada. Prioriza impacto estratégico sobre descripción de cifras. Saltos de párrafo con \\n.',
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  console.log('[AI] stop_reason:', message.stop_reason);

  // Extraer el resultado del tool_use
  const toolBlock = message.content.find(b => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    // Fallback: si no usó tool, intentar parsear texto plano
    const textBlock = message.content.find(b => b.type === 'text');
    const responseText = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    console.error('[AI] No usó tool_use. Respuesta:\n', responseText.slice(0, 500));
    throw new Error('La IA no generó el informe correctamente. Intenta nuevamente.');
  }

  const parsed = toolBlock.input as AIAnalysisResult;

  // Rellenar claves faltantes por seguridad
  const requiredKeys: (keyof AIAnalysisResult)[] = [
    'executiveSummary', 'incomeAnalysis', 'balanceAnalysis', 'financingAnalysis',
    'investmentAnalysis', 'liquidityAnalysis', 'rotationAnalysis', 'solvencyAnalysis',
    'valuationAnalysis', 'trendAnalysis', 'consistencyAlerts', 'strategicAlerts',
    'prioritizedRecommendations',
  ];

  for (const key of requiredKeys) {
    if (!parsed[key]) {
      parsed[key] = 'Análisis no disponible para esta sección con los datos proporcionados.';
    }
  }

  console.log('[AI] Informe generado correctamente con tool_use.');
  return parsed;
}
