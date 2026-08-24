/**
 * docx-monthly-generator.ts
 * Informes DOCX del Forecast Mensual: Prometheia (narrativo, completo) y
 * Ejecutivo (tarjetas, breve). Reutiliza los helpers de estilo de
 * docx-generator.ts (narrativo) y docx-executive-summary.ts (tarjetas de
 * alertas/recomendaciones) en vez de duplicar la lógica de formato.
 */

import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ShadingType, PageOrientation,
  Header, Footer, PageNumber,
} from 'docx';
import fs from 'fs';
import type { MonthlyPnLRow, MonthlyBalanceRow } from '../services/monthly-forecast.service';
import type { MonthlyPrometheiaResult, MonthlyEjecutivoResult } from '../services/monthly-ai-analysis.service';
import {
  sanitize, styledParagraph, sectionHeading, subSectionHeading, bodyText, infoBox,
  NAVY_DARK, AMBER, AMBER_LIGHT, WHITE,
} from './docx-generator';
import {
  sectionTitle, subTitle, para, spacer, parseAlerts, buildAlertCards,
  parseRecommendations, buildRecommendationCards, borders,
  NAVY as EXEC_NAVY, GRAY as EXEC_GRAY, GRAY2 as EXEC_GRAY2, TEXT as EXEC_TEXT,
} from './docx-executive-summary';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export interface DocxMonthlyReportData {
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
  pnl: MonthlyPnLRow[];
  balance: MonthlyBalanceRow[];
}

function fmtAmount(v: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(v)) + ' ' + currency;
}

// ─── Shared: 12-month P&G table (narrative style, matches infoBox palette) ──
function monthlyPnlTable(data: DocxMonthlyReportData): Table {
  const currency = data.company.currency || 'EUR';
  const rows = [
    { label: 'Ingresos', get: (r: MonthlyPnLRow) => r.revenue },
    { label: 'Margen Bruto', get: (r: MonthlyPnLRow) => r.grossMargin },
    { label: 'Resultado Explotación', get: (r: MonthlyPnLRow) => r.operatingResult },
    { label: 'Resultado Neto', get: (r: MonthlyPnLRow) => r.netIncome },
  ];

  const headerRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: NAVY_DARK },
        children: [new Paragraph({ children: [new TextRun({ text: 'Concepto', bold: true, size: 16, color: WHITE, font: 'Calibri' })] })],
      }),
      ...MONTHS.map((m, i) => new TableCell({
        width: { size: 78 / 12, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: i < data.closedMonths ? '334155' : NAVY_DARK },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: m, bold: true, size: 15, color: WHITE, font: 'Calibri' })] })],
      })),
    ],
  });

  const dataRows = rows.map(r => new TableRow({
    children: [
      new TableCell({
        shading: { type: ShadingType.SOLID, color: AMBER_LIGHT },
        children: [new Paragraph({ children: [new TextRun({ text: sanitize(r.label), bold: true, size: 15, color: NAVY_DARK, font: 'Calibri' })] })],
      }),
      ...data.pnl.map(row => new TableCell({
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtAmount(r.get(row), '').trim(), size: 14, color: '374151', font: 'Calibri' })] })],
      })),
    ],
  }));

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] });
}

// ─── Shared: balance snapshot table (December close) ────────────────────────
function decemberBalanceTable(data: DocxMonthlyReportData): Table {
  const currency = data.company.currency || 'EUR';
  const dec = data.balance[11];
  const rows: [string, number][] = [
    ['Activo No Corriente', dec.totalNoncurrentAssets],
    ['Existencias', dec.inventory],
    ['Clientes y deudores', dec.accountsReceivable],
    ['Otros Realizables', dec.otherReceivables],
    ['Tesorería', dec.cashEquivalents],
    ['TOTAL ACTIVO', dec.totalAssets],
    ['Patrimonio Neto', dec.equity],
    ['Pasivo No Corriente', dec.totalNoncurrentLiabilities],
    ['Pasivo Corriente', dec.totalCurrentLiabilities],
    ['TOTAL PATRIMONIO Y PASIVO', dec.totalEquityAndLiabilities],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => infoBox(label, fmtAmount(value, currency))),
  });
}

// ─── PROMETHEIA MENSUAL (narrativo, completo) ────────────────────────────────

export async function generateMonthlyNarrativeDocx(
  data: DocxMonthlyReportData,
  analysis: MonthlyPrometheiaResult,
  outputPath: string,
): Promise<void> {
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 20, color: '374151' } } } },
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT },
          margin: { top: 1080, bottom: 720, left: 900, right: 900 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: AMBER } },
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'PROMETHEIA  |  Forecast Mensual', size: 16, color: '6b7280', font: 'Calibri' }),
              new TextRun({ text: '  —  CONFIDENCIAL', size: 16, bold: true, color: AMBER, font: 'Calibri' }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: AMBER } },
            spacing: { before: 80 },
            children: [
              new TextRun({ text: sanitize(`${data.company.name}  |  Forecast ${data.year}  |  Pág. `), size: 16, color: '6b7280', font: 'Calibri' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '6b7280', font: 'Calibri' }),
            ],
          })],
        }),
      },
      children: [
        // ─── COVER ────────────────────────────────────────────
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 0 },
          shading: { type: ShadingType.SOLID, color: NAVY_DARK },
          children: [new TextRun({ text: '  INFORME MENSUAL  ', bold: true, size: 52, color: WHITE, font: 'Calibri' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          shading: { type: ShadingType.SOLID, color: AMBER },
          children: [new TextRun({ text: `  FORECAST ${data.year} — PROMETHEIA  `, bold: true, size: 24, color: WHITE, font: 'Calibri' })],
        }),
        styledParagraph(' ', { size: 18, spacing: 40 }),
        styledParagraph(`Fecha de emisión: ${dateStr}`, { align: AlignmentType.RIGHT, size: 20, color: '6b7280', spacing: 80 }),
        styledParagraph(' ', { size: 12, spacing: 20 }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            infoBox('Empresa', data.company.name),
            infoBox('Identificación fiscal', data.company.taxId || 'No especificado'),
            infoBox('Giro / Actividad', data.company.businessActivity || 'No especificado'),
            infoBox('Sector / Industria', data.company.industry || 'No especificado'),
            infoBox('Moneda', data.company.currency || 'EUR'),
            infoBox('Año del Forecast', String(data.year)),
            infoBox('Meses cerrados (dato real)', `${data.closedMonths} de 12`),
            infoBox('Año base de datos anuales', String(data.baseYear)),
          ],
        }),

        styledParagraph(' ', { size: 24, spacing: 200 }),

        sectionHeading('1', 'Resumen Ejecutivo'),
        ...bodyText(analysis.executiveSummary),

        sectionHeading('2', 'Pérdidas y Ganancias — Evolución Mensual'),
        monthlyPnlTable(data),
        styledParagraph(' ', { size: 16, spacing: 100 }),
        ...bodyText(analysis.monthlyPnlAnalysis),

        sectionHeading('3', 'Balance Proyectado'),
        subSectionHeading('3.1', `Cierre estimado a diciembre ${data.year}`),
        decemberBalanceTable(data),
        styledParagraph(' ', { size: 16, spacing: 100 }),
        ...bodyText(analysis.projectedBalanceAnalysis),

        sectionHeading('4', 'Posición de Tesorería'),
        ...bodyText(analysis.cashPositionAnalysis),

        sectionHeading('5', 'Capital Circulante'),
        ...bodyText(analysis.workingCapitalAnalysis),

        sectionHeading('6', 'Real vs. Proyectado'),
        ...bodyText(analysis.closedVsProjectedComparison),

        sectionHeading('7', 'Tendencias Mensuales'),
        ...bodyText(analysis.monthlyTrendAnalysis),

        sectionHeading('8', 'Consistencia de los Datos'),
        ...bodyText(analysis.consistencyAlerts),

        sectionHeading('9', 'Alertas Estratégicas'),
        ...bodyText(analysis.strategicAlerts),

        sectionHeading('10', 'Recomendaciones Priorizadas'),
        ...bodyText(analysis.prioritizedRecommendations),

        styledParagraph(' ', { size: 24, spacing: 200 }),
        new Paragraph({
          spacing: { before: 200, after: 120 },
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: AMBER }, bottom: { style: BorderStyle.SINGLE, size: 6, color: AMBER } },
          shading: { type: ShadingType.SOLID, color: AMBER_LIGHT },
          children: [new TextRun({ text: '  CIERRE TÉCNICO  ', bold: true, size: 22, color: NAVY_DARK, font: 'Calibri' })],
        }),
        ...bodyText(
          `Este informe ha sido generado por PROMETHEIA a partir del Forecast Mensual ${data.year} de ${data.company.name}, combinando datos reales de los meses cerrados con proyecciones calculadas según las tasas de crecimiento configuradas por el usuario.\n\nSu contenido es de carácter confidencial y ha sido preparado exclusivamente para uso interno del destinatario.\n\nFecha de emisión: ${dateStr}`,
        ),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}

// ─── EJECUTIVO MENSUAL (tarjetas, breve) ─────────────────────────────────────

export async function generateMonthlyExecutiveSummaryDocx(
  data: DocxMonthlyReportData,
  analysis: MonthlyEjecutivoResult,
  outputPath: string,
): Promise<void> {
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const alerts = parseAlerts(analysis.criticalAlerts);
  const recs = parseRecommendations(analysis.topRecommendations);
  const dec = data.balance[11];
  const currency = data.company.currency || 'EUR';
  const annualRevenue = data.pnl.reduce((s, r) => s + r.revenue, 0);
  const annualNetIncome = data.pnl.reduce((s, r) => s + r.netIncome, 0);

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 18, color: EXEC_TEXT } } } },
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT },
          margin: { top: 1080, bottom: 720, left: 900, right: 900 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: AMBER } },
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'PROMETHEIA  |  Forecast Mensual — Ejecutivo', size: 16, color: '6b7280', font: 'Calibri' }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: AMBER } },
            spacing: { before: 80 },
            children: [
              new TextRun({ text: sanitize(`${data.company.name}  |  Forecast ${data.year}  |  Pág. `), size: 16, color: '6b7280', font: 'Calibri' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '6b7280', font: 'Calibri' }),
            ],
          })],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 0 },
          shading: { type: ShadingType.SOLID, color: EXEC_NAVY },
          children: [new TextRun({ text: '  INFORME EJECUTIVO — FORECAST MENSUAL  ', bold: true, size: 32, color: WHITE, font: 'Calibri' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
          shading: { type: ShadingType.SOLID, color: AMBER },
          children: [new TextRun({ text: `  ${data.company.name.toUpperCase()} — ${data.year}  `, bold: true, size: 20, color: WHITE, font: 'Calibri' })],
        }),
        para(`Emitido el ${dateStr}. Basado en el Forecast Mensual ${data.year} (${data.closedMonths} de 12 meses con dato real).`, { color: '6b7280', size: 16 }),
        spacer(160),

        sectionTitle(1, 'Cifras Clave del Ejercicio'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: EXEC_GRAY }, borders: borders(EXEC_GRAY2), margins: { top: 100, bottom: 100, left: 140, right: 100 }, children: [
                para('Ingresos proyectados (año)', { bold: true, size: 16 }),
                para(fmtAmount(annualRevenue, currency), { size: 22, color: EXEC_NAVY, bold: true }),
              ] }),
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: EXEC_GRAY }, borders: borders(EXEC_GRAY2), margins: { top: 100, bottom: 100, left: 140, right: 100 }, children: [
                para('Resultado neto proyectado (año)', { bold: true, size: 16 }),
                para(fmtAmount(annualNetIncome, currency), { size: 22, color: EXEC_NAVY, bold: true }),
              ] }),
            ] }),
            new TableRow({ children: [
              new TableCell({ shading: { type: ShadingType.SOLID, color: EXEC_GRAY }, borders: borders(EXEC_GRAY2), margins: { top: 100, bottom: 100, left: 140, right: 100 }, children: [
                para('Tesorería estimada a diciembre', { bold: true, size: 16 }),
                para(fmtAmount(dec.cashEquivalents, currency), { size: 22, color: EXEC_NAVY, bold: true }),
              ] }),
              new TableCell({ shading: { type: ShadingType.SOLID, color: EXEC_GRAY }, borders: borders(EXEC_GRAY2), margins: { top: 100, bottom: 100, left: 140, right: 100 }, children: [
                para('Total Activo estimado a diciembre', { bold: true, size: 16 }),
                para(fmtAmount(dec.totalAssets, currency), { size: 22, color: EXEC_NAVY, bold: true }),
              ] }),
            ] }),
          ],
        }),
        spacer(200),

        sectionTitle(2, 'Resumen Ejecutivo'),
        para(analysis.executiveSummary),
        spacer(160),

        sectionTitle(3, 'Hallazgos Clave'),
        ...(analysis.keyFindings.split('\n').filter(l => l.trim()).map(l => para(l.trim(), { size: 17 }))),
        spacer(160),

        sectionTitle(4, 'Alertas Críticas'),
        alerts.length > 0 ? [...buildAlertCards(alerts)] : [para('Sin alertas críticas.', { size: 17 })],

        spacer(160),
        sectionTitle(5, 'Principales Recomendaciones'),
        recs.length > 0 ? [...buildRecommendationCards(recs)] : [para('Sin recomendaciones adicionales.', { size: 17 })],
      ].flat(),
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}
