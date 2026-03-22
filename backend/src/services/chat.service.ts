/**
 * chat.service.ts
 * Builds the full financial context for a company and streams a response
 * from Claude acting as a dedicated financial analyst for that company.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toNum(v: Decimal | null | undefined): number {
  return v == null ? 0 : parseFloat(v.toString());
}
function toNumOpt(v: Decimal | null | undefined): number | null {
  return v == null ? null : parseFloat(v.toString());
}
function n(v: number | null | undefined, dec = 0): string {
  if (v == null || isNaN(v)) return 'n/d';
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(v);
}
function pct(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return 'n/d';
  return `${v.toFixed(2)}%`;
}

// ─── Build system prompt with all company data ────────────────────────────────
async function buildSystemPrompt(companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      fiscalYears: {
        include: {
          balanceSheet: true,
          incomeStatement: true,
          cashFlow: true,
          additionalData: true,
          calculatedRatios: true,
        },
        orderBy: { year: 'asc' },
      },
      projections: {
        include: { projections: { orderBy: { year: 'asc' } } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
      reports: {
        where: { status: 'COMPLETED' },
        orderBy: { generatedAt: 'desc' },
        take: 1,
        select: { aiAnalysis: true },
      },
    },
  });

  if (!company) throw new Error('Empresa no encontrada');

  const currency = company.currency || 'EUR';
  const years = company.fiscalYears.map(fy => fy.year).sort((a, b) => a - b);

  let ctx = `Eres TAXFINIA AI, un analista financiero experto asignado exclusivamente a la empresa "${company.name}".
Tienes acceso completo a todos sus datos financieros históricos, ratios calculados y proyecciones.
Responde siempre en español, de forma clara, directa y profesional.
Si el usuario pregunta sobre otra empresa, indica que solo tienes información sobre "${company.name}".
Cuando hagas cálculos o comparaciones, cita los números exactos de los datos que tienes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMACIÓN DE LA EMPRESA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nombre: ${company.name}
NIF/RUT: ${company.taxId || 'No especificado'}
Sector: ${company.industry || 'No especificado'}
Actividad: ${company.businessActivity || 'No especificada'}
País: ${company.country || 'No especificado'}
Moneda: ${currency}
Ejercicios disponibles: ${years.join(', ')}
`;

  // ── Financial statements per year ─────────────────────────────────────────
  for (const fy of company.fiscalYears) {
    const bs = fy.balanceSheet;
    const is = fy.incomeStatement;
    const cf = fy.cashFlow;
    const ad = fy.additionalData;
    const r = fy.calculatedRatios;

    ctx += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EJERCICIO ${fy.year}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    if (is) {
      const revenue = toNum(is.revenue);
      const cos = toNum(is.costOfSales) + toNum(is.staffCostsSales);
      const gm = revenue - cos;
      const admin = toNum(is.adminExpenses) + toNum(is.staffCostsAdmin);
      const dep = toNum(is.depreciation);
      const ebitda = gm - admin;
      const ebit = ebitda - dep;
      const excResult = toNum(is.exceptionalIncome) - toNum(is.exceptionalExpenses);
      const finResult = toNum(is.financialIncome) - toNum(is.financialExpenses);
      const ebt = ebit + excResult + finResult;
      const tax = toNum(is.incomeTax);
      const net = ebt - tax;

      ctx += `
CUENTA DE RESULTADOS (${currency}):
  Ingresos por ventas:       ${n(revenue)}
  Coste de ventas:           ${n(cos)}
  Margen bruto:              ${n(gm)} (${revenue > 0 ? pct(gm / revenue * 100) : 'n/d'})
  Gastos de administración:  ${n(admin)}
  EBITDA:                    ${n(ebitda)} (${revenue > 0 ? pct(ebitda / revenue * 100) : 'n/d'})
  Depreciaciones:            ${n(dep)}
  EBIT (Res. explotación):   ${n(ebit)}
  Resultado excepcional:     ${n(excResult)}
  Resultado financiero:      ${n(finResult)}
  BAI (Beneficio antes imp.):${n(ebt)} (${revenue > 0 ? pct(ebt / revenue * 100) : 'n/d'})
  Impuesto sobre sociedades: ${n(tax)}
  Beneficio neto:            ${n(net)} (${revenue > 0 ? pct(net / revenue * 100) : 'n/d'})`;
    }

    if (bs) {
      const ncA = toNum(bs.tangibleAssets) + toNum(bs.intangibleAssets) + toNum(bs.financialInvestmentsLp) + toNum(bs.otherNoncurrentAssets);
      const cA = toNum(bs.inventory) + toNum(bs.accountsReceivable) + toNum(bs.otherReceivables) + toNum(bs.taxReceivables) + toNum(bs.cashEquivalents);
      const totalA = ncA + cA;
      const equity = toNum(bs.shareCapital) + toNum(bs.reserves) + toNum(bs.retainedEarnings) - toNum(bs.treasuryStock);
      const ncL = toNum(bs.provisionsLp) + toNum(bs.bankDebtLp) + toNum(bs.otherLiabilitiesLp);
      const cL = toNum(bs.provisionsSp) + toNum(bs.bankDebtSp) + toNum(bs.accountsPayable) + toNum(bs.taxLiabilities) + toNum(bs.otherLiabilitiesSp);
      const wc = cA - cL;

      ctx += `
BALANCE DE SITUACIÓN (${currency}):
  Activo no corriente:       ${n(ncA)}
  Activo corriente:          ${n(cA)}
    - Existencias:           ${n(toNum(bs.inventory))}
    - Cuentas por cobrar:    ${n(toNum(bs.accountsReceivable))}
    - Tesorería:             ${n(toNum(bs.cashEquivalents))}
  TOTAL ACTIVO:              ${n(totalA)}
  Patrimonio neto:           ${n(equity)}
  Pasivo no corriente:       ${n(ncL)}
  Pasivo corriente:          ${n(cL)}
  Fondo de maniobra:         ${n(wc)}`;
    }

    if (cf) {
      ctx += `
FLUJOS DE EFECTIVO (${currency}):
  Flujo operativo:           ${n(toNum(cf.operatingCashFlow))}
  Flujo de inversión:        ${n(toNum(cf.cfInvestments) - toNum(cf.cfDivestments))}
  Flujo de financiación:     ${n(toNum(cf.cfDebtObtained) - toNum(cf.cfDebtRepaid) - toNum(cf.cfDividendsPaid))}`;
    }

    if (ad) {
      if (ad.averageEmployees) ctx += `\n  Empleados promedio:        ${ad.averageEmployees}`;
      if (ad.sharePrice) ctx += `\n  Precio acción:             ${n(toNumOpt(ad.sharePrice), 2)}`;
    }

    if (r) {
      ctx += `
RATIOS CALCULADOS:
  Liquidez general:          ${r.currentRatio != null ? toNum(r.currentRatio).toFixed(2) : 'n/d'}
  Acid test:                 ${r.quickRatio != null ? toNum(r.quickRatio).toFixed(2) : 'n/d'}
  Ratio disponibilidad:      ${r.cashRatio != null ? toNum(r.cashRatio).toFixed(2) : 'n/d'}
  Deuda / Equity:            ${r.debtToEquity != null ? toNum(r.debtToEquity).toFixed(2) : 'n/d'}
  Deuda / Activo:            ${r.debtToAssets != null ? toNum(r.debtToAssets).toFixed(2) : 'n/d'}
  Deuda / EBITDA:            ${r.debtToEbitda != null ? toNum(r.debtToEbitda).toFixed(2) : 'n/d'}
  ROE:                       ${r.roe != null ? pct(toNum(r.roe)) : 'n/d'}
  ROA:                       ${r.roa != null ? pct(toNum(r.roa)) : 'n/d'}
  Margen bruto:              ${r.grossMargin != null ? pct(toNum(r.grossMargin)) : 'n/d'}
  Margen EBITDA:             ${r.ebitdaMargin != null ? pct(toNum(r.ebitdaMargin)) : 'n/d'}
  Margen neto:               ${r.netMargin != null ? pct(toNum(r.netMargin)) : 'n/d'}
  Rotación de activo:        ${r.assetTurnover != null ? toNum(r.assetTurnover).toFixed(2) : 'n/d'}
  Días de cobro:             ${r.daysSalesOutstanding != null ? `${toNum(r.daysSalesOutstanding).toFixed(1)} días` : 'n/d'}
  Días de pago:              ${r.daysPayableOutstanding != null ? `${toNum(r.daysPayableOutstanding).toFixed(1)} días` : 'n/d'}
  Z-Score Altman:            ${r.altmanZScore != null ? toNum(r.altmanZScore).toFixed(2) : 'n/d'}`;
    }
  }

  // ── DCF / Projections ─────────────────────────────────────────────────────
  const scenario = company.projections[0];
  if (scenario && scenario.wacc) {
    ctx += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROYECCIONES DCF — "${scenario.name}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WACC:                      ${pct(toNum(scenario.wacc) * 100)}
  Tasa crecimiento terminal: ${scenario.terminalGrowthRate != null ? pct(toNum(scenario.terminalGrowthRate) * 100) : 'n/d'}
  Valor empresa (EV):        ${scenario.enterpriseValue != null ? n(toNum(scenario.enterpriseValue)) : 'n/d'} ${currency}
  Valor del equity:          ${scenario.equityValue != null ? n(toNum(scenario.equityValue)) : 'n/d'} ${currency}
  Valor por acción:          ${scenario.valuePerShare != null ? n(toNum(scenario.valuePerShare), 2) : 'n/d'} ${currency}`;

    if (scenario.projections.length > 0) {
      ctx += '\n  FCF proyectados por año:';
      for (const p of scenario.projections) {
        ctx += `\n    ${p.year}: FCF ${n(toNum(p.freeCashFlow))} | Ventas ${n(toNum(p.revenue))} | EBITDA ${n(toNum(p.ebitda))}`;
      }
    }
  }

  // ── AI analysis summary (if a report was generated) ───────────────────────
  const latestReport = company.reports[0];
  if (latestReport?.aiAnalysis) {
    const ai = latestReport.aiAnalysis as any;
    ctx += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANÁLISIS PREVIO GENERADO POR IA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    const sections: [string, string][] = [
      ['Resumen ejecutivo', ai.executiveSummary],
      ['Análisis de resultados', ai.incomeAnalysis],
      ['Análisis de balance', ai.balanceAnalysis],
      ['Análisis de liquidez', ai.liquidityAnalysis],
      ['Análisis de solvencia', ai.solvencyAnalysis],
      ['Valoración', ai.valuationAnalysis],
      ['Alertas estratégicas', ai.strategicAlerts],
      ['Recomendaciones', ai.prioritizedRecommendations],
    ];
    for (const [title, text] of sections) {
      if (text) ctx += `\n${title}:\n${text}\n`;
    }
  }

  ctx += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Usa estos datos para responder cualquier pregunta del usuario sobre la empresa.
Sé concreto, cita números, identifica tendencias y da recomendaciones accionables.`;

  return ctx;
}

// ─── Chat handler ─────────────────────────────────────────────────────────────
export async function chatWithCompany(
  companyId: string,
  message: string,
  history: ChatMessage[],
): Promise<string> {
  const systemPrompt = await buildSystemPrompt(companyId);

  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');
  return block.text;
}
