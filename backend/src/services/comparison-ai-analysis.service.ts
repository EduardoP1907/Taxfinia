/**
 * Comparison AI Analysis Service
 * Generates the 13-section Prometheia-style narrative for the two comparison
 * reports (Forecast vs Anual / Forecast vs Budget vs Anual), reusing the same
 * AIAnalysisResult shape and tool_use schema as the annual report, but with a
 * prompt that explicitly labels each period as Real/Forecast/Budget and asks
 * for an analysis of deviations instead of a plain historical narrative.
 */

import Anthropic from '@anthropic-ai/sdk';
import { formatAmount, pct, nd, type FinancialDataForAI, type AIAnalysisResult } from './ai-analysis.service';
import type { ComparisonReportType } from './comparison-financial-data.service';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const RESULT_KEYS: (keyof AIAnalysisResult)[] = [
  'executiveSummary', 'incomeAnalysis', 'balanceAnalysis', 'financingAnalysis',
  'investmentAnalysis', 'liquidityAnalysis', 'rotationAnalysis', 'solvencyAnalysis',
  'valuationAnalysis', 'trendAnalysis', 'consistencyAlerts', 'strategicAlerts',
  'prioritizedRecommendations',
];

function growthLabel(current: number, previous: number): string {
  if (!previous || previous === 0) return 'N/D';
  const g = ((current - previous) / Math.abs(previous)) * 100;
  const arrow = g > 0 ? '▲' : g < 0 ? '▼' : '—';
  return `${arrow} ${Math.abs(g).toFixed(1)}%`;
}

// ─── Comparative multi-period table ────────────────────────────────────────

function buildComparisonTable(data: FinancialDataForAI, periodLabels: Record<number, string>): string {
  const cur = data.company.currency || 'EUR';
  const sortedYears = [...data.years].sort((a, b) => a - b);
  const labels = sortedYears.map(y => periodLabels[y] || String(y));

  let table = `\n╔═══ TABLA COMPARATIVA (${labels.join(' | ')}) ═══╗\n`;

  table += '\n--- ESTADO DE RESULTADOS ---\n';
  table += `Período:         ${labels.map(l => l.padStart(16)).join('')}\n`;

  const metrics: { label: string; getValue: (y: number) => number | undefined }[] = [
    { label: 'Ingresos Ventas', getValue: y => data.incomeData[y]?.revenue },
    { label: 'Margen Bruto',    getValue: y => data.incomeData[y]?.grossMargin },
    { label: 'EBITDA',          getValue: y => data.incomeData[y]?.ebitda },
    { label: 'Res. Explotación',getValue: y => data.incomeData[y]?.operatingResult },
    { label: 'Resultado Neto',  getValue: y => data.incomeData[y]?.netIncome },
  ];
  for (const m of metrics) {
    const values = sortedYears.map(y => m.getValue(y) ?? 0);
    table += `${m.label.padEnd(17)}${values.map(v => formatAmount(v, cur).padStart(16)).join('')}\n`;
  }

  table += '\n--- PORCENTAJES SOBRE VENTAS ---\n';
  const pctMetrics: { label: string; getValue: (y: number) => number | undefined }[] = [
    { label: 'Margen Bruto %',  getValue: y => data.incomeData[y]?.grossMarginPct },
    { label: 'EBITDA %',        getValue: y => data.incomeData[y]?.ebitdaPct },
    { label: 'Margen Neto %',   getValue: y => data.incomeData[y]?.netMarginPct },
  ];
  for (const m of pctMetrics) {
    const values = sortedYears.map(y => m.getValue(y) ?? 0);
    table += `${m.label.padEnd(17)}${values.map(v => pct(v).padStart(16)).join('')}\n`;
  }

  table += '\n--- BALANCE ---\n';
  const balMetrics: { label: string; getValue: (y: number) => number | undefined }[] = [
    { label: 'Total Activo',    getValue: y => data.balanceData[y]?.totalAssets },
    { label: 'Patrimonio Neto', getValue: y => data.balanceData[y]?.equity },
    { label: 'Deuda Total',     getValue: y => data.balanceData[y]?.totalDebt },
    { label: 'Fondo Maniobra',  getValue: y => data.balanceData[y]?.workingCapital },
  ];
  for (const m of balMetrics) {
    const values = sortedYears.map(y => m.getValue(y) ?? 0);
    table += `${m.label.padEnd(17)}${values.map(v => formatAmount(v, cur).padStart(16)).join('')}\n`;
  }

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
    table += `${m.label.padEnd(17)}${values.map(v => nd(v).padStart(16)).join('')}\n`;
  }

  table += '\n--- VARIACIONES ENTRE PERÍODOS ---\n';
  for (let i = 1; i < sortedYears.length; i++) {
    const yr = sortedYears[i];
    const yp = sortedYears[i - 1];
    const revCurr = data.incomeData[yr]?.revenue ?? 0;
    const revPrev = data.incomeData[yp]?.revenue ?? 0;
    const ebitdaCurr = data.incomeData[yr]?.ebitda ?? 0;
    const ebitdaPrev = data.incomeData[yp]?.ebitda ?? 0;
    const netCurr = data.incomeData[yr]?.netIncome ?? 0;
    const netPrev = data.incomeData[yp]?.netIncome ?? 0;
    table += `${periodLabels[yr] || yr} vs ${periodLabels[yp] || yp}: Ventas ${growthLabel(revCurr, revPrev)} | EBITDA ${growthLabel(ebitdaCurr, ebitdaPrev)} | Neto ${growthLabel(netCurr, netPrev)}\n`;
  }

  table += '╚══════════════════════════════════════════════════════════╝\n';
  return table;
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

function buildComparisonPrompt(
  data: FinancialDataForAI,
  periodLabels: Record<number, string>,
  type: ComparisonReportType,
): string {
  const cur = data.company.currency || 'EUR';
  const sortedYears = [...data.years].sort((a, b) => a - b);
  const forecastYear = data.latestYear;
  const budgetYear = type === 'FORECAST_BUDGET_VS_ANNUAL' ? sortedYears[sortedYears.length - 1] : undefined;
  const inc = data.incomeData[forecastYear];
  const bal = data.balanceData[forecastYear];
  const rat = data.ratiosData[forecastYear];

  if (!inc || !bal) {
    throw new Error(`No hay datos suficientes para el período ${periodLabels[forecastYear] || forecastYear}`);
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

  const comparisonTable = buildComparisonTable(data, periodLabels);

  const scopeExplanation = type === 'FORECAST_BUDGET_VS_ANNUAL'
    ? `Este informe compara TRES tipos de período: (1) los últimos 3 ejercicios REALES cerrados, (2) el FORECAST ${forecastYear} (proyección del ejercicio en curso, combina meses reales cerrados con meses proyectados), y (3) el BUDGET ${budgetYear} (presupuesto del ejercicio siguiente, construido a partir del cierre proyectado del Forecast). Debes analizar explícitamente: la consistencia del Forecast frente a la tendencia histórica real, y la consistencia del Budget frente al Forecast (¿qué tasa de crecimiento implícita asume el Budget respecto al Forecast? ¿es razonable dada la tendencia histórica?).`
    : `Este informe compara los últimos 3 ejercicios REALES cerrados contra el FORECAST ${forecastYear} (proyección del ejercicio en curso, combina meses reales cerrados con meses proyectados). Debes analizar explícitamente si el Forecast es consistente con la tendencia histórica real: ¿qué tasa de crecimiento implícita asume respecto al último año real? ¿es razonable?`;

  return `Eres PROMETHEIA, un sistema experto de gestión y control financiero orientado a directorios. Tu rol es transformar estados financieros en inteligencia estratégica, no limitarte a describir cifras.

Este es un INFORME COMPARATIVO DE PROYECCIÓN, no un informe histórico puro. ${scopeExplanation}

DATOS DE LA EMPRESA:
- Nombre: ${data.company.name}
- RUT/NIF: ${data.company.taxId || 'No especificado'}
- Giro/Actividad: ${data.company.businessActivity || 'No especificado'}
- Sector/Industria: ${data.company.industry || 'No especificado'}
- País: ${data.company.country || 'No especificado'}
- Moneda de análisis: ${currencyLabel}
- Períodos incluidos: ${sortedYears.map(y => periodLabels[y] || String(y)).join(', ')}

${formatInstructions}

NOTA METODOLÓGICA IMPORTANTE (para tu propio criterio, no la repitas literalmente en cada sección salvo que sea relevante): en los períodos Forecast/Budget, el EBITDA y el Altman Z-Score se calculan con una depreciación y un patrimonio inicial ESTIMADOS por proyección (no son datos contables cerrados), por lo que son aproximaciones razonables, no cifras auditadas. Indícalo si es relevante para alguna alerta o conclusión, pero no lo repitas en cada sección.

${comparisonTable}

=== ESTADO DE RESULTADOS ${periodLabels[forecastYear] || forecastYear} (DETALLE) ===
- Ingresos por Ventas: ${formatAmount(inc.revenue, cur)}
- Coste de Ventas: ${formatAmount(inc.costOfSales, cur)} (${pct(inc.revenue > 0 ? inc.costOfSales / inc.revenue * 100 : 0)} de ventas)
- Margen Bruto: ${formatAmount(inc.grossMargin, cur)} (${pct(inc.grossMarginPct)}%)
- Gastos de Administración: ${formatAmount(inc.adminExpenses, cur)} (${pct(inc.revenue > 0 ? inc.adminExpenses / inc.revenue * 100 : 0)} de ventas)
- EBITDA: ${formatAmount(inc.ebitda, cur)} (margen ${pct(inc.ebitdaPct)}%)
- Depreciaciones (estimadas): ${formatAmount(inc.depreciation, cur)}
- Resultado de Explotación: ${formatAmount(inc.operatingResult, cur)} (${pct(inc.operatingResultPct)}%)
- Resultado Excepcional: ${formatAmount(inc.exceptionalResult, cur)}
- Resultado Financiero: ${formatAmount(inc.financialResult, cur)}
- Resultado Antes de Impuestos (RAI): ${formatAmount(inc.ebt, cur)} (${pct(inc.ebtPct)}%)
- Impuestos: ${formatAmount(inc.incomeTax, cur)}
- Resultado Neto: ${formatAmount(inc.netIncome, cur)} (margen neto ${pct(inc.netMarginPct)}%)

=== BALANCE ${periodLabels[forecastYear] || forecastYear} (DETALLE) ===
- Total Activo: ${formatAmount(bal.totalAssets, cur)}
  - Activo Fijo: ${formatAmount(bal.nonCurrentAssets, cur)}
  - Activo Circulante: ${formatAmount(bal.currentAssets, cur)}
    - Existencias: ${formatAmount(bal.inventory, cur)}
    - Cuentas por Cobrar: ${formatAmount(bal.accountsReceivable, cur)}
    - Tesorería/Disponible: ${formatAmount(bal.cash, cur)}
- Patrimonio Neto: ${formatAmount(bal.equity, cur)}
- Pasivo No Circulante: ${formatAmount(bal.nonCurrentLiabilities, cur)}
- Pasivo Circulante: ${formatAmount(bal.currentLiabilities, cur)}
- Fondo de Maniobra: ${formatAmount(bal.workingCapital, cur)}

=== RATIOS FINANCIEROS ${periodLabels[forecastYear] || forecastYear} ===
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
- Altman Z-Score (estimado): ${nd(rat?.altmanZScore)} ${rat?.altmanZScore != null ? (rat.altmanZScore > 2.9 ? '(Zona Segura)' : rat.altmanZScore > 1.23 ? '(Zona Gris)' : '(Zona de Alerta)') : ''}

═══════════════════════════════════════════════════════════════════
INSTRUCCIONES PARA EL INFORME — PROMETHEIA COMPARATIVO
═══════════════════════════════════════════════════════════════════

AUDIENCIA: Directorio de empresa. Perfil: toma de decisiones estratégicas sobre la proyección del negocio, no análisis técnico detallado.

REGLAS DE FORMATO OBLIGATORIAS:
1. Cada sección: máximo 2 párrafos introductorios breves (2-3 oraciones cada uno)
2. Luego 3-5 bullets con los hallazgos clave (formato: "- Hallazgo: implicación")
3. Cerrar SIEMPRE con: "Conclusion: [una oración con el veredicto]" y "Accion recomendada: [una accion concreta]"
4. Texto plano, sin markdown, sin asteriscos, sin hashtags
5. Párrafos separados por salto de línea
6. Prioriza SIEMPRE la comparación Real vs Forecast${type === 'FORECAST_BUDGET_VS_ANNUAL' ? ' vs Budget' : ''} sobre la simple descripción de cifras — identifica desviaciones y su causa probable
7. Refierete a los períodos usando sus etiquetas exactas (${sortedYears.map(y => periodLabels[y] || String(y)).join(', ')}), no solo el año
8. Moneda EXCLUSIVAMENTE: ${cur} con el formato indicado

Responde ÚNICAMENTE con este JSON válido (13 claves exactas):

{
  "executiveSummary": "Párrafo 1: situación proyectada en 2-3 oraciones, contrastando el Forecast${type === 'FORECAST_BUDGET_VS_ANNUAL' ? '/Budget' : ''} contra la tendencia real. Párrafo 2: trayectoria principal en 2-3 oraciones.\\n- Fortaleza clave: [dato]\\n- Principal riesgo/desviación: [dato]\\n- Tendencia dominante: [dato]\\nConclusion: [veredicto ejecutivo en una oración]\\nAccion recomendada: [acción concreta para el directorio]",

  "incomeAnalysis": "Evolución de ventas y márgenes, comparando explícitamente el Forecast${type === 'FORECAST_BUDGET_VS_ANNUAL' ? '/Budget' : ''} contra la tendencia real.\\n- Ventas: [tasa de crecimiento implícita del Forecast vs. histórico]\\n- Margen bruto: [tendencia]\\n- EBITDA: [valor y margen, consistencia con lo histórico]\\n- Resultado neto: [valor y margen]\\nConclusion: [veredicto]\\nAccion recomendada: [acción concreta]",

  "balanceAnalysis": "Estructura del activo y patrimonio proyectados vs. real.\\n- Activo total: [evolución]\\n- Fondo de maniobra: [estado]\\n- Patrimonio neto: [tendencia]\\n- Endeudamiento: [nivel]\\nConclusion: [veredicto]\\nAccion recomendada: [acción concreta]",

  "financingAnalysis": "Autonomía financiera y capitalización proyectadas.\\n- Ratio de autonomía: [valor e interpretación]\\n- Calidad de la deuda: [CP vs LP]\\n- Capacidad de autofinanciación: [estado]\\nConclusion: [veredicto]\\nAccion recomendada: [acción concreta]",

  "investmentAnalysis": "Política de inversión implícita en la proyección.\\n- Activo no corriente: [evolución]\\n- Depreciaciones (estimadas): [nivel relativo]\\nConclusion: [veredicto]\\nAccion recomendada: [acción concreta]",

  "liquidityAnalysis": "Posición de liquidez proyectada vs. real.\\n- Liquidez general: [valor vs umbral 1.0]\\n- Acid test: [valor]\\n- Disponibilidad: [valor]\\nConclusion: [veredicto]\\nAccion recomendada: [acción concreta]",

  "rotationAnalysis": "Eficiencia operativa proyectada.\\n- Días de cobro (DSO): [valor y tendencia]\\n- Días de pago (DPO): [valor y tendencia]\\n- Ciclo de caja: [valor e implicación]\\nConclusion: [veredicto]\\nAccion recomendada: [acción concreta]",

  "solvencyAnalysis": "Capacidad de pago y apalancamiento proyectados.\\n- Deuda/EBITDA (estimado): [valor vs umbral 4x]\\n- Altman Z-Score (estimado): [valor e interpretación de zona]\\nConclusion: [veredicto]\\nAccion recomendada: [acción concreta]",

  "valuationAnalysis": "Impacto de la proyección sobre el valor de la empresa (análisis cualitativo, no hay DCF disponible para este informe comparativo).\\n- Dirección de valor: [creación/destrucción de valor implícita en la tendencia proyectada]\\nConclusion: [veredicto]\\nAccion recomendada: [acción concreta]",

  "trendAnalysis": "Fase de ciclo del negocio según la proyección.\\n- Tasa de crecimiento del Forecast vs. CAGR histórico real: [valor]\\n- Dirección de márgenes: [expansión/contracción/estable]\\n- Tendencia de liquidez: [mejora/deterioro/estable]\\n- Tendencia de endeudamiento: [mejora/deterioro/estable]\\n- Fase empresarial proyectada: [crecimiento/estabilización/deterioro/recuperación]\\nConclusion: [veredicto de tendencia]\\nAccion recomendada: [acción concreta]",

  "consistencyAlerts": "Coherencia entre la proyección y los datos reales.\\n- [Consistencia o anomalía 1]: [descripción, incluye si la tasa implícita del Forecast${type === 'FORECAST_BUDGET_VS_ANNUAL' ? '/Budget' : ''} es poco realista frente al histórico]\\n- [Consistencia o anomalía 2]: [descripción]\\nConclusion: [veredicto de confiabilidad de la proyección]",

  "strategicAlerts": "MINIMO 4 alertas. Cada una en párrafo separado con formato exacto:\\n[NIVEL: CRITICA/ALTA/MEDIA/BAJA] AREA: descripción del indicador, valor proyectado vs umbral o vs tendencia real, riesgo concreto para el cierre del ejercicio${type === 'FORECAST_BUDGET_VS_ANNUAL' ? '/próximo ejercicio' : ''}.",

  "prioritizedRecommendations": "MINIMO 5 recomendaciones. Cada una en párrafo separado con formato exacto:\\n[PRIORIDAD: ALTA/MEDIA/BAJA] AREA EN MAYUSCULAS: accion concreta. Por que: [dato especifico que la justifica]. Impacto esperado: [resultado financiero]. Plazo: [corto/mediano/largo]."
}`;
}

// ─── Tool definition (mirrors ai-analysis.service.ts exactly, 13 keys) ─────

const comparisonTools: Anthropic.Tool[] = [
  {
    name: 'generate_comparison_financial_report',
    description: 'Genera el informe comparativo Forecast/Budget vs. años reales, con todos los análisis requeridos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        executiveSummary:           { type: 'string', description: '2 párrafos breves + 3 bullets + Conclusion + Accion recomendada. Orientado a directorio.' },
        incomeAnalysis:             { type: 'string', description: '2 párrafos breves + bullets de hallazgos clave + Conclusion + Accion recomendada.' },
        balanceAnalysis:            { type: 'string', description: '2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        financingAnalysis:          { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        investmentAnalysis:         { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        liquidityAnalysis:          { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        rotationAnalysis:           { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        solvencyAnalysis:           { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        valuationAnalysis:          { type: 'string', description: '1-2 párrafos breves + bullets + Conclusion + Accion recomendada.' },
        trendAnalysis:              { type: 'string', description: '1 párrafo + bullets de tendencias + fase empresarial + Conclusion + Accion recomendada.' },
        consistencyAlerts:          { type: 'string', description: '1 párrafo + bullets de consistencias/anomalías + Conclusion.' },
        strategicAlerts:            { type: 'string', description: 'MINIMO 4 alertas. Formato: [NIVEL: CRITICA/ALTA/MEDIA/BAJA] AREA: indicador, valor actual, umbral, riesgo. Una por párrafo.' },
        prioritizedRecommendations: { type: 'string', description: 'MINIMO 5 recomendaciones. Formato: [PRIORIDAD: ALTA/MEDIA/BAJA] AREA: accion. Por que: dato. Impacto: resultado. Plazo: horizonte.' },
      },
      required: RESULT_KEYS as string[],
    },
  },
];

export async function generateComparisonAnalysis(
  data: FinancialDataForAI,
  periodLabels: Record<number, string>,
  type: ComparisonReportType,
): Promise<AIAnalysisResult> {
  const prompt = buildComparisonPrompt(data, periodLabels, type);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    tools: comparisonTools,
    tool_choice: { type: 'any' },
    system: 'Eres PROMETHEIA, sistema experto de control de gestión para directorios, especializado en informes comparativos Forecast/Budget vs. años reales. Usa generate_comparison_financial_report. Textos en español, sin markdown ni asteriscos. Formato: párrafos breves + bullets + Conclusion + Accion recomendada. Prioriza el análisis de desviaciones entre lo proyectado y la tendencia real. Saltos de párrafo con \\n.',
    messages: [{ role: 'user', content: prompt }],
  });

  const toolBlock = message.content.find(b => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('La IA no generó el informe comparativo correctamente. Intenta nuevamente.');
  }

  const parsed = toolBlock.input as AIAnalysisResult;
  for (const key of RESULT_KEYS) {
    if (!parsed[key]) parsed[key] = 'Análisis no disponible para esta sección con los datos proporcionados.';
  }
  return parsed;
}
