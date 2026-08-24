import Anthropic from '@anthropic-ai/sdk';
import { formatAmount, pct, nd } from './ai-analysis.service';
import type { MonthlyPnLRow, MonthlyBalanceRow } from './monthly-forecast.service';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export interface MonthlyFinancialDataForAI {
  company: {
    name: string;
    taxId?: string;
    industry?: string;
    businessActivity?: string;
    country?: string;
    currency?: string;
  };
  year: number;
  baseYear: number;
  closedMonths: number;
  pnl: MonthlyPnLRow[];       // 12 rows, Jan–Dec
  balance: MonthlyBalanceRow[]; // 12 rows, Jan–Dec
}

// ─── Prometheia mensual (informe completo) ─────────────────────────────────

export interface MonthlyPrometheiaResult {
  executiveSummary: string;
  monthlyPnlAnalysis: string;
  projectedBalanceAnalysis: string;
  cashPositionAnalysis: string;
  workingCapitalAnalysis: string;
  closedVsProjectedComparison: string;
  monthlyTrendAnalysis: string;
  consistencyAlerts: string;
  strategicAlerts: string;
  prioritizedRecommendations: string;
}

const PROMETHEIA_KEYS: (keyof MonthlyPrometheiaResult)[] = [
  'executiveSummary', 'monthlyPnlAnalysis', 'projectedBalanceAnalysis', 'cashPositionAnalysis',
  'workingCapitalAnalysis', 'closedVsProjectedComparison', 'monthlyTrendAnalysis',
  'consistencyAlerts', 'strategicAlerts', 'prioritizedRecommendations',
];

// ─── Ejecutivo mensual (informe conciso) ───────────────────────────────────

export interface MonthlyEjecutivoResult {
  executiveSummary: string;
  keyFindings: string;
  criticalAlerts: string;
  topRecommendations: string;
}

const EJECUTIVO_KEYS: (keyof MonthlyEjecutivoResult)[] = [
  'executiveSummary', 'keyFindings', 'criticalAlerts', 'topRecommendations',
];

// ─── Shared: build the 12-month P&G + Balance tables ───────────────────────

function buildMonthlyTables(data: MonthlyFinancialDataForAI): string {
  const cur = data.company.currency || 'EUR';
  const { pnl, balance, closedMonths } = data;

  let out = `\n╔═══ P&G MENSUAL ${data.year} (${MONTHS.join(' | ')}) ═══╗\n`;
  out += `Estado:          ${MONTHS.map((_, i) => (i < closedMonths ? 'Real'.padStart(10) : 'Proy.'.padStart(10))).join('')}\n`;

  const pnlMetrics: { label: string; getValue: (r: MonthlyPnLRow) => number }[] = [
    { label: 'Ingresos',      getValue: r => r.revenue },
    { label: 'Margen Bruto',  getValue: r => r.grossMargin },
    { label: 'Res.Explot.',   getValue: r => r.operatingResult },
    { label: 'EBT',           getValue: r => r.ebt },
    { label: 'Res.Neto',      getValue: r => r.netIncome },
  ];
  for (const m of pnlMetrics) {
    out += `${m.label.padEnd(17)}${pnl.map(r => formatAmount(m.getValue(r), cur).padStart(10)).join('')}\n`;
  }
  const annualRevenue = pnl.reduce((s, r) => s + r.revenue, 0);
  const annualNetIncome = pnl.reduce((s, r) => s + r.netIncome, 0);
  out += `\nTotal anual: Ingresos ${formatAmount(annualRevenue, cur)} | Resultado Neto ${formatAmount(annualNetIncome, cur)}\n`;
  out += '╚══════════════════════════════════════════════════════════╝\n';

  const dec = balance[11];
  const lastClosed = closedMonths > 0 ? balance[closedMonths - 1] : null;

  out += `\n╔═══ BALANCE PROYECTADO — CIERRE DICIEMBRE ${data.year} ═══╗\n`;
  out += `Total Activo: ${formatAmount(dec.totalAssets, cur)}\n`;
  out += `  Activo No Corriente: ${formatAmount(dec.totalNoncurrentAssets, cur)}\n`;
  out += `  Activo Corriente: ${formatAmount(dec.totalCurrentAssets, cur)} (Existencias ${formatAmount(dec.inventory, cur)}, Clientes ${formatAmount(dec.accountsReceivable, cur)}, Otros Realizables ${formatAmount(dec.otherReceivables, cur)}, Tesorería ${formatAmount(dec.cashEquivalents, cur)})\n`;
  out += `Patrimonio Neto: ${formatAmount(dec.equity, cur)}\n`;
  out += `Pasivo No Corriente: ${formatAmount(dec.totalNoncurrentLiabilities, cur)}\n`;
  out += `Pasivo Corriente: ${formatAmount(dec.totalCurrentLiabilities, cur)} (Proveedores ${formatAmount(dec.accountsPayable, cur)}, Deuda CP ${formatAmount(dec.bankDebtSp, cur)})\n`;
  const currentRatio = dec.totalCurrentLiabilities !== 0 ? dec.totalCurrentAssets / dec.totalCurrentLiabilities : null;
  out += `Ratio de Liquidez General (Dic): ${nd(currentRatio)}\n`;
  if (dec.imbalance !== 0) {
    out += `ADVERTENCIA: descuadre de balance en diciembre por ${formatAmount(dec.imbalance, cur)} (revisar overrides manuales)\n`;
  }
  if (lastClosed) {
    out += `\nÚltimo mes cerrado (real, mes ${closedMonths}): Tesorería ${formatAmount(lastClosed.cashEquivalents, cur)}, Clientes ${formatAmount(lastClosed.accountsReceivable, cur)}\n`;
  }
  out += '╚══════════════════════════════════════════════════════════╝\n';

  return out;
}

function companyBlock(data: MonthlyFinancialDataForAI): string {
  const cur = data.company.currency || 'EUR';
  return `DATOS DE LA EMPRESA:
- Nombre: ${data.company.name}
- Identificación fiscal: ${data.company.taxId || 'No especificado'}
- Giro/Actividad: ${data.company.businessActivity || 'No especificado'}
- Sector/Industria: ${data.company.industry || 'No especificado'}
- País: ${data.company.country || 'No especificado'}
- Moneda: ${cur}
- Año del forecast: ${data.year} (base de datos anuales: ${data.baseYear})
- Meses cerrados (dato real): ${data.closedMonths} de 12 — el resto son proyecciones calculadas con tasas de crecimiento mensual.`;
}

// ─── Prompt: Prometheia mensual (completo) ─────────────────────────────────

function buildMonthlyPrometheiaPrompt(data: MonthlyFinancialDataForAI): string {
  return `Eres PROMETHEIA, un sistema experto de gestión y control financiero orientado a directorios. Vas a analizar el FORECAST MENSUAL de ${data.year} de una empresa: P&G mes a mes y balance proyectado, combinando meses reales (cerrados) y meses proyectados.

${companyBlock(data)}

${buildMonthlyTables(data)}

═══════════════════════════════════════════════════════════════════
INSTRUCCIONES PARA EL INFORME COMPLETO — PROMETHEIA MENSUAL
═══════════════════════════════════════════════════════════════════

AUDIENCIA: Directorio / dirección financiera. Informe COMPLETO y desarrollado, con foco en la gestión del ejercicio en curso.

REGLAS DE FORMATO OBLIGATORIAS:
1. Cada sección: máximo 2 párrafos introductorios breves (2-3 oraciones cada uno)
2. Luego 3-5 bullets con los hallazgos clave (formato: "- Hallazgo: implicación")
3. Cerrar SIEMPRE con: "Conclusion: [una oración con el veredicto]" y "Accion recomendada: [una accion concreta]"
4. Texto plano, sin markdown, sin asteriscos, sin hashtags
5. Párrafos separados por salto de línea
6. Distingue explícitamente meses reales (cerrados) de meses proyectados al comentar cifras
7. Moneda EXCLUSIVAMENTE: ${data.company.currency || 'EUR'}

Responde ÚNICAMENTE con este JSON válido (10 claves exactas):

{
  "executiveSummary": "Situación del forecast mensual a la fecha y proyección de cierre de año.\\n- Hallazgo clave 1\\n- Hallazgo clave 2\\n- Hallazgo clave 3\\nConclusion: [veredicto]\\nAccion recomendada: [accion]",

  "monthlyPnlAnalysis": "Evolución mensual de ventas, márgenes y resultado.\\n- bullets\\nConclusion: [veredicto]\\nAccion recomendada: [accion]",

  "projectedBalanceAnalysis": "Evolución del balance proyectado mes a mes hasta diciembre.\\n- bullets\\nConclusion: [veredicto]\\nAccion recomendada: [accion]",

  "cashPositionAnalysis": "Posición y evolución de tesorería mes a mes, riesgo de tensión de caja.\\n- bullets\\nConclusion: [veredicto]\\nAccion recomendada: [accion]",

  "workingCapitalAnalysis": "Capital circulante: existencias, clientes, otros realizables, proveedores.\\n- bullets\\nConclusion: [veredicto]\\nAccion recomendada: [accion]",

  "closedVsProjectedComparison": "Compara el desempeño real (meses cerrados) contra lo que se había proyectado para esos mismos meses, y qué implica para el resto del año.\\n- bullets\\nConclusion: [veredicto]\\nAccion recomendada: [accion]",

  "monthlyTrendAnalysis": "Tendencia mes a mes: aceleración/desaceleración de ventas, estacionalidad visible, fase del ejercicio.\\n- bullets\\nConclusion: [veredicto]\\nAccion recomendada: [accion]",

  "consistencyAlerts": "Coherencia del forecast: descuadres de balance, tasas de crecimiento poco realistas, saltos abruptos.\\n- bullets\\nConclusion: [veredicto de confiabilidad]",

  "strategicAlerts": "MINIMO 3 alertas. Cada una en párrafo separado: [NIVEL: CRITICA/ALTA/MEDIA/BAJA] AREA: descripción del indicador, valor actual vs umbral, riesgo concreto para el cierre del ejercicio.",

  "prioritizedRecommendations": "MINIMO 4 recomendaciones. Cada una en párrafo separado: [PRIORIDAD: ALTA/MEDIA/BAJA] AREA EN MAYUSCULAS: accion concreta. Por que: [dato que la justifica]. Impacto esperado: [resultado]. Plazo: [antes de fin de año/corto/mediano]."
}`;
}

const prometheiaTools: Anthropic.Tool[] = [
  {
    name: 'generate_monthly_report_full',
    description: 'Genera el informe mensual completo (Prometheia) del forecast mensual.',
    input_schema: {
      type: 'object' as const,
      properties: {
        executiveSummary:            { type: 'string' },
        monthlyPnlAnalysis:          { type: 'string' },
        projectedBalanceAnalysis:    { type: 'string' },
        cashPositionAnalysis:        { type: 'string' },
        workingCapitalAnalysis:      { type: 'string' },
        closedVsProjectedComparison: { type: 'string' },
        monthlyTrendAnalysis:        { type: 'string' },
        consistencyAlerts:           { type: 'string' },
        strategicAlerts:             { type: 'string' },
        prioritizedRecommendations:  { type: 'string' },
      },
      required: PROMETHEIA_KEYS as string[],
    },
  },
];

export async function generateMonthlyPrometheiaAnalysis(
  data: MonthlyFinancialDataForAI,
): Promise<MonthlyPrometheiaResult> {
  const prompt = buildMonthlyPrometheiaPrompt(data);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 12000,
    tools: prometheiaTools,
    tool_choice: { type: 'any' },
    system: 'Eres PROMETHEIA, sistema experto de control de gestión para directorios, especializado en forecast mensual. Usa generate_monthly_report_full. Textos en español, sin markdown ni asteriscos. Formato: párrafos breves + bullets + Conclusion + Accion recomendada.',
    messages: [{ role: 'user', content: prompt }],
  });

  const toolBlock = message.content.find(b => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('La IA no generó el informe mensual Prometheia correctamente. Intenta nuevamente.');
  }

  const parsed = toolBlock.input as MonthlyPrometheiaResult;
  for (const key of PROMETHEIA_KEYS) {
    if (!parsed[key]) parsed[key] = 'Análisis no disponible para esta sección con los datos proporcionados.';
  }
  return parsed;
}

// ─── Prompt: Ejecutivo mensual (conciso) ───────────────────────────────────

function buildMonthlyEjecutivoPrompt(data: MonthlyFinancialDataForAI): string {
  return `Eres PROMETHEIA, sistema experto de control de gestión. Vas a redactar un informe EJECUTIVO — breve, directo y preciso — sobre el FORECAST MENSUAL de ${data.year} de una empresa.

${companyBlock(data)}

${buildMonthlyTables(data)}

═══════════════════════════════════════════════════════════════════
INSTRUCCIONES PARA EL INFORME EJECUTIVO — PROMETHEIA MENSUAL
═══════════════════════════════════════════════════════════════════

AUDIENCIA: Dirección general, lectura en menos de 2 minutos.

REGLAS DE FORMATO OBLIGATORIAS — SÉ BREVE Y PRECISO, NO DESARROLLES:
1. Nada de párrafos largos: frases cortas y directas
2. Sin relleno ni contexto innecesario — solo el dato y su implicación
3. Texto plano, sin markdown, sin asteriscos, sin hashtags
4. Moneda EXCLUSIVAMENTE: ${data.company.currency || 'EUR'}
5. Prioriza precisión numérica sobre desarrollo narrativo

Responde ÚNICAMENTE con este JSON válido (4 claves exactas):

{
  "executiveSummary": "Máximo 3 frases cortas: cierre de año proyectado, resultado esperado, un riesgo u oportunidad principal.",

  "keyFindings": "Entre 3 y 5 hallazgos, uno por línea, formato: '- [dato numérico concreto]: [implicación en una frase corta]'.",

  "criticalAlerts": "Solo alertas realmente críticas (0 a 3). Si no hay ninguna, indica 'Sin alertas críticas.'. Formato: '- [AREA]: [riesgo concreto en una frase]'.",

  "topRecommendations": "Entre 2 y 4 recomendaciones, una por línea, formato: '- [accion concreta]: [resultado esperado en pocas palabras]'."
}`;
}

const ejecutivoTools: Anthropic.Tool[] = [
  {
    name: 'generate_monthly_report_executive',
    description: 'Genera el informe mensual ejecutivo (breve y preciso) del forecast mensual.',
    input_schema: {
      type: 'object' as const,
      properties: {
        executiveSummary:    { type: 'string' },
        keyFindings:         { type: 'string' },
        criticalAlerts:      { type: 'string' },
        topRecommendations:  { type: 'string' },
      },
      required: EJECUTIVO_KEYS as string[],
    },
  },
];

export async function generateMonthlyEjecutivoAnalysis(
  data: MonthlyFinancialDataForAI,
): Promise<MonthlyEjecutivoResult> {
  const prompt = buildMonthlyEjecutivoPrompt(data);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    tools: ejecutivoTools,
    tool_choice: { type: 'any' },
    system: 'Eres PROMETHEIA, sistema experto de control de gestión, redactando un informe EJECUTIVO breve y preciso sobre un forecast mensual. Usa generate_monthly_report_executive. Textos en español, sin markdown, frases cortas, sin relleno.',
    messages: [{ role: 'user', content: prompt }],
  });

  const toolBlock = message.content.find(b => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('La IA no generó el informe mensual Ejecutivo correctamente. Intenta nuevamente.');
  }

  const parsed = toolBlock.input as MonthlyEjecutivoResult;
  for (const key of EJECUTIVO_KEYS) {
    if (!parsed[key]) parsed[key] = 'No disponible.';
  }
  return parsed;
}
