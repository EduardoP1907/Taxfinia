/**
 * docx-tables-generator.ts
 * Generates the "Reporte de Tablas" as a DOCX file with embedded charts.
 * Charts are rendered server-side via chartjs-node-canvas and embedded as images.
 * Word then handles the final PDF conversion via docx-to-pdf.ts.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  PageOrientation,
  ImageRun,
  Header,
  Footer,
  PageNumber,
  HeadingLevel,
} from 'docx';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import fs from 'fs';

// ─── Re-export interface (matches pdf-generator.ts) ──────────────────────────
export type { PDFReportData } from './pdf-generator';
import type { PDFReportData } from './pdf-generator';

// ─── Palette ──────────────────────────────────────────────────────────────────
const NAVY   = '0f172a';
const AMBER  = 'f59e0b';
const AMBER_LIGHT = 'fef3c7';
const WHITE  = 'ffffff';
const GRAY   = 'f1f5f9';
const GRAY2  = 'e2e8f0';
const TEXT   = '1e293b';
const TEXT_S = '64748b';
const GREEN  = '059669';
const RED    = 'dc2626';

// ─── Chart renderer ──────────────────────────────────────────────────────────
const chartCanvas = new ChartJSNodeCanvas({ width: 700, height: 320, backgroundColour: 'white' });

async function renderBarChart(
  labels: string[],
  datasets: { label: string; data: (number | null)[]; color: string }[],
  title: string,
): Promise<Buffer> {
  return chartCanvas.renderToBuffer({
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map(d => ({
        label: d.label,
        data: d.data,
        backgroundColor: d.color + 'cc',
        borderColor: d.color,
        borderWidth: 1.5,
        borderRadius: 4,
      })),
    },
    options: {
      responsive: false,
      plugins: {
        title: { display: true, text: title, font: { size: 13, weight: 'bold' }, color: '#0f172a' },
        legend: { position: 'bottom', labels: { font: { size: 10 }, color: '#334155' } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#334155' } },
        y: { grid: { color: '#e2e8f0' }, ticks: { color: '#334155' } },
      },
    },
  } as any);
}

async function renderLineChart(
  labels: string[],
  datasets: { label: string; data: (number | null)[]; color: string }[],
  title: string,
): Promise<Buffer> {
  return chartCanvas.renderToBuffer({
    type: 'line',
    data: {
      labels,
      datasets: datasets.map(d => ({
        label: d.label,
        data: d.data,
        borderColor: d.color,
        backgroundColor: d.color + '22',
        borderWidth: 2.5,
        pointRadius: 5,
        pointBackgroundColor: d.color,
        fill: true,
        tension: 0.3,
      })),
    },
    options: {
      responsive: false,
      plugins: {
        title: { display: true, text: title, font: { size: 13, weight: 'bold' }, color: '#0f172a' },
        legend: { position: 'bottom', labels: { font: { size: 10 }, color: '#334155' } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#334155' } },
        y: { grid: { color: '#e2e8f0' }, ticks: { color: '#334155' } },
      },
    },
  } as any);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function n(v: number | null | undefined, dec = 0): string {
  if (v == null || isNaN(v)) return 'n/d';
  return new Intl.NumberFormat('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}
function pct(v: number | null | undefined, dec = 1): string {
  if (v == null || isNaN(v)) return 'n/d';
  return `${v.toFixed(dec)}%`;
}

// ─── DocX cell helpers ────────────────────────────────────────────────────────
function cell(
  text: string,
  opts: { bold?: boolean; bg?: string; color?: string; align?: typeof AlignmentType[keyof typeof AlignmentType]; shade?: string } = {}
): TableCell {
  return new TableCell({
    shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: GRAY2 },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: GRAY2 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
    },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.RIGHT,
        children: [
          new TextRun({
            text,
            bold: opts.bold ?? false,
            size: 18,
            color: opts.color ?? TEXT,
            font: 'Calibri',
          }),
        ],
      }),
    ],
  });
}

function headerCell(text: string, align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.RIGHT): TableCell {
  return cell(text, { bold: true, bg: NAVY, color: WHITE, align });
}

function sectionCell(text: string, colSpan: number): TableCell {
  return new TableCell({
    columnSpan: colSpan,
    shading: { type: ShadingType.SOLID, color: AMBER },
    borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18, color: WHITE, font: 'Calibri' })],
      }),
    ],
  });
}

// ─── Section heading paragraph ────────────────────────────────────────────────
function heading(num: string, title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 120 },
    shading: { type: ShadingType.SOLID, color: AMBER },
    children: [
      new TextRun({ text: `  ${num}  `, bold: true, size: 24, color: WHITE, font: 'Calibri' }),
      new TextRun({ text: `  ${title}`, bold: true, size: 22, color: NAVY, font: 'Calibri' }),
    ],
  });
}

function subheading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 20, color: NAVY, font: 'Calibri' })],
  });
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { after: 100 } });
}

function imgParagraph(buf: Buffer, w: number, h: number): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [
      new ImageRun({
        data: buf,
        transformation: { width: w, height: h },
        type: 'png',
      } as any),
    ],
  });
}

// ─── Income Statement table ────────────────────────────────────────────────────
function buildIncomeTable(data: PDFReportData, years: number[]): Table {
  const colCount = 1 + years.length * 2;

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Concepto', AlignmentType.LEFT),
      ...years.flatMap(yr => [
        headerCell(String(yr)),
        headerCell('%'),
      ]),
    ],
  });

  const rows: { label: string; key: string; bold: boolean; isPct?: boolean; pctKey?: string }[] = [
    { label: 'INGRESOS POR VENTAS',      key: 'revenue',           bold: true },
    { label: 'Coste de las Ventas',       key: 'costOfSales',       bold: false },
    { label: 'MARGEN BRUTO',             key: 'grossMargin',       bold: true, isPct: true, pctKey: 'grossMarginPct' },
    { label: 'Gastos de Administración', key: 'adminExpenses',     bold: false },
    { label: 'EBITDA',                   key: 'ebitda',            bold: true, isPct: true, pctKey: 'ebitdaPct' },
    { label: 'Depreciaciones',           key: 'depreciation',      bold: false },
    { label: 'RESULTADO EXPLOTACIÓN',    key: 'operatingResult',   bold: true, isPct: true, pctKey: 'operatingResultPct' },
    { label: 'Resultado Excepcional',    key: 'exceptionalResult', bold: false },
    { label: 'Resultado Financiero',     key: 'financialResult',   bold: false },
    { label: 'BAI (Beneficio Bruto)',    key: 'ebt',               bold: true, isPct: true, pctKey: 'ebtPct' },
    { label: 'Impuestos',               key: 'incomeTax',         bold: false },
    { label: 'BENEFICIO NETO',          key: 'netIncome',         bold: true, isPct: true, pctKey: 'netMarginPct' },
  ];

  const dataRows = rows.map((row, idx) => {
    const bg = row.bold ? AMBER_LIGHT : (idx % 2 === 0 ? WHITE : GRAY);
    return new TableRow({
      children: [
        cell(row.label, { bold: row.bold, bg, align: AlignmentType.LEFT }),
        ...years.flatMap(yr => {
          const d = data.incomeData[yr];
          const val = d ? (d as any)[row.key] as number : null;
          const pctVal = d
            ? row.isPct
              ? (d as any)[row.pctKey!] as number
              : d.revenue > 0 ? (val ?? 0) / d.revenue * 100 : null
            : null;
          return [
            cell(n(val), { bold: row.bold, bg }),
            cell(pct(pctVal), { bg, color: TEXT_S }),
          ];
        }),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

// ─── Balance Sheet table ──────────────────────────────────────────────────────
function buildBalanceTable(data: PDFReportData, years: number[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Concepto', AlignmentType.LEFT),
      ...years.flatMap(yr => [headerCell(String(yr)), headerCell('%')]),
    ],
  });

  const rows: { label: string; key: string; bold: boolean; section?: boolean }[] = [
    { label: 'ACTIVO NO CORRIENTE',            key: 'nonCurrentAssets',      bold: true },
    { label: 'ACTIVO CORRIENTE',               key: 'currentAssets',         bold: true },
    { label: '  Existencias',                  key: 'inventory',             bold: false },
    { label: '  Cuentas por Cobrar',           key: 'accountsReceivable',    bold: false },
    { label: '  Tesorería / Disponible',       key: 'cash',                  bold: false },
    { label: 'TOTAL ACTIVO',                   key: 'totalAssets',           bold: true },
    { label: 'PATRIMONIO NETO',                key: 'equity',                bold: true },
    { label: 'PASIVO NO CORRIENTE',            key: 'nonCurrentLiabilities', bold: true },
    { label: 'PASIVO CORRIENTE',               key: 'currentLiabilities',    bold: true },
    { label: 'TOTAL PASIVO + PATRIMONIO NETO', key: 'totalAssets',           bold: true },
    { label: 'Fondo de Maniobra',             key: 'workingCapital',        bold: false },
  ];

  const dataRows = rows.map((row, idx) => {
    const bg = row.bold ? AMBER_LIGHT : (idx % 2 === 0 ? WHITE : GRAY);
    return new TableRow({
      children: [
        cell(row.label, { bold: row.bold, bg, align: AlignmentType.LEFT }),
        ...years.flatMap(yr => {
          const d = data.balanceData[yr];
          const val = d ? (d as any)[row.key] as number : null;
          const base = d?.totalAssets ?? 1;
          const pctVal = val != null && base > 0 ? val / base * 100 : null;
          return [
            cell(n(val), { bold: row.bold, bg }),
            cell(pct(pctVal), { bg, color: TEXT_S }),
          ];
        }),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

// ─── Ratios table ─────────────────────────────────────────────────────────────
function buildRatiosTable(data: PDFReportData, years: number[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Ratio', AlignmentType.LEFT),
      ...years.map(yr => headerCell(String(yr))),
    ],
  });

  type RatioRow = { label: string; key: string; fmt: (v: number) => string; section?: string };

  const groups: { title: string; rows: RatioRow[] }[] = [
    {
      title: 'LIQUIDEZ',
      rows: [
        { label: 'Ratio de Liquidez General', key: 'currentRatio', fmt: v => v.toFixed(2) },
        { label: 'Acid Test (Liquidez Inmediata)', key: 'quickRatio', fmt: v => v.toFixed(2) },
        { label: 'Ratio de Disponibilidad', key: 'cashRatio', fmt: v => v.toFixed(2) },
      ],
    },
    {
      title: 'ENDEUDAMIENTO Y SOLVENCIA',
      rows: [
        { label: 'Deuda / Equity', key: 'debtToEquity', fmt: v => v.toFixed(2) },
        { label: 'Deuda / Activo Total', key: 'debtToAssets', fmt: v => v.toFixed(2) },
        { label: 'Deuda / EBITDA', key: 'debtToEbitda', fmt: v => v.toFixed(2) },
      ],
    },
    {
      title: 'RENTABILIDAD',
      rows: [
        { label: 'ROE (Rentabilidad Financiera)', key: 'roe', fmt: v => pct(v) },
        { label: 'ROA (Rentabilidad Económica)', key: 'roa', fmt: v => pct(v) },
        { label: 'Margen Bruto', key: 'grossMargin', fmt: v => pct(v) },
        { label: 'Margen EBITDA', key: 'ebitdaMargin', fmt: v => pct(v) },
        { label: 'Margen Neto', key: 'netMargin', fmt: v => pct(v) },
      ],
    },
    {
      title: 'ACTIVIDAD Y EFICIENCIA',
      rows: [
        { label: 'Rotación de Activo', key: 'assetTurnover', fmt: v => v.toFixed(2) },
        { label: 'Días Promedio de Cobro', key: 'daysSalesOutstanding', fmt: v => `${v.toFixed(1)} días` },
        { label: 'Días Promedio de Pago', key: 'daysPayableOutstanding', fmt: v => `${v.toFixed(1)} días` },
      ],
    },
    {
      title: 'RIESGO — ALTMAN Z-SCORE',
      rows: [
        { label: 'Z-Score de Altman', key: 'altmanZScore', fmt: v => v.toFixed(2) },
      ],
    },
  ];

  const tableRows: TableRow[] = [headerRow];
  let rowIdx = 0;

  for (const group of groups) {
    tableRows.push(
      new TableRow({
        children: [sectionCell(group.title, 1 + years.length)],
      })
    );
    for (const row of group.rows) {
      const bg = rowIdx % 2 === 0 ? WHITE : GRAY;
      rowIdx++;
      tableRows.push(
        new TableRow({
          children: [
            cell(row.label, { align: AlignmentType.LEFT, bg }),
            ...years.map(yr => {
              const d = data.ratiosData[yr];
              const val = d ? (d as any)[row.key] as number | null : null;
              const isZ = row.key === 'altmanZScore';
              const color = isZ && val != null
                ? (val > 2.9 ? GREEN : val < 1.23 ? RED : 'd97706')
                : TEXT;
              return cell(val != null ? row.fmt(val) : 'n/d', { bg, color });
            }),
          ],
        })
      );
    }
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateTablesDocx(data: PDFReportData, outputPath: string): Promise<void> {
  const years = data.years.slice().sort((a, b) => a - b);
  const yearLabels = years.map(String);

  // ── Charts ──────────────────────────────────────────────────────────────────
  const revenueChart = await renderBarChart(
    yearLabels,
    [
      { label: 'Ingresos', data: years.map(y => data.incomeData[y]?.revenue ?? null), color: '#0f172a' },
      { label: 'EBITDA',   data: years.map(y => data.incomeData[y]?.ebitda ?? null),  color: '#f59e0b' },
      { label: 'Bº Neto',  data: years.map(y => data.incomeData[y]?.netIncome ?? null), color: '#059669' },
    ],
    'Evolución de Resultados',
  );

  const balanceChart = await renderBarChart(
    yearLabels,
    [
      { label: 'Activo Total',  data: years.map(y => data.balanceData[y]?.totalAssets ?? null),          color: '#0f172a' },
      { label: 'Patrimonio',    data: years.map(y => data.balanceData[y]?.equity ?? null),               color: '#f59e0b' },
      { label: 'Deuda Total',   data: years.map(y => data.balanceData[y]?.totalDebt ?? null),            color: '#dc2626' },
    ],
    'Estructura Financiera',
  );

  const rentabilityChart = await renderLineChart(
    yearLabels,
    [
      { label: 'ROE (%)', data: years.map(y => data.ratiosData[y]?.roe ?? null),         color: '#0f172a' },
      { label: 'ROA (%)', data: years.map(y => data.ratiosData[y]?.roa ?? null),         color: '#f59e0b' },
      { label: 'Margen Neto (%)', data: years.map(y => data.ratiosData[y]?.netMargin ?? null), color: '#059669' },
    ],
    'Evolución de Rentabilidad',
  );

  const liquidityChart = await renderLineChart(
    yearLabels,
    [
      { label: 'Liquidez General', data: years.map(y => data.ratiosData[y]?.currentRatio ?? null), color: '#0f172a' },
      { label: 'Acid Test',        data: years.map(y => data.ratiosData[y]?.quickRatio ?? null),   color: '#f59e0b' },
    ],
    'Evolución de Liquidez',
  );

  const debtChart = await renderLineChart(
    yearLabels,
    [
      { label: 'Deuda / Equity',       data: years.map(y => data.ratiosData[y]?.debtToEquity  ?? null), color: '#dc2626' },
      { label: 'Deuda / Activo Total', data: years.map(y => data.ratiosData[y]?.debtToAssets  ?? null), color: '#f59e0b' },
      { label: 'Deuda / EBITDA',       data: years.map(y => data.ratiosData[y]?.debtToEbitda  ?? null), color: '#7c3aed' },
    ],
    'Endeudamiento y Solvencia',
  );

  const activity1Chart = await renderBarChart(
    yearLabels,
    [
      { label: 'Rotación de Activo', data: years.map(y => data.ratiosData[y]?.assetTurnover ?? null), color: '#0891b2' },
    ],
    'Actividad Eficiencia 1 — Rotación de Activo',
  );

  const activity2Chart = await renderBarChart(
    yearLabels,
    [
      { label: 'Días Promedio de Cobro', data: years.map(y => data.ratiosData[y]?.daysSalesOutstanding  ?? null), color: '#7c3aed' },
      { label: 'Días Promedio de Pago',  data: years.map(y => data.ratiosData[y]?.daysPayableOutstanding ?? null), color: '#64748b' },
    ],
    'Actividad Eficiencia 2 — Días Promedio de Cobro y Pago',
  );

  const today = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Document ─────────────────────────────────────────────────────────────────
  const doc = new Document({
    sections: [
      // ── PORTADA ──────────────────────────────────────────────────────────────
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
        headers: {
          default: new Header({ children: [] }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'TAXFINIA — CONFIDENCIAL  •  ', size: 16, color: TEXT_S, font: 'Calibri' }),
                  new TextRun({ text: 'Página ', size: 16, color: TEXT_S, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: TEXT_S, font: 'Calibri' }),
                  new TextRun({ text: ' de ', size: 16, color: TEXT_S, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: TEXT_S, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Header block
          new Paragraph({
            shading: { type: ShadingType.SOLID, color: NAVY },
            spacing: { before: 0, after: 0 },
            children: [new TextRun({ text: '  TAXFINIA  —  Reporte Económico-Financiero', bold: true, size: 36, color: WHITE, font: 'Calibri' })],
          }),
          new Paragraph({
            shading: { type: ShadingType.SOLID, color: AMBER },
            spacing: { before: 0, after: 400 },
            children: [new TextRun({ text: '  Análisis Cuantitativo con Tablas y Gráficos  ', bold: false, size: 22, color: NAVY, font: 'Calibri' })],
          }),

          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [new TextRun({ text: data.company.name.toUpperCase(), bold: true, size: 48, color: NAVY, font: 'Calibri' })],
          }),

          ...[
            `NIF / RUT:  ${data.company.taxId || 'No especificado'}`,
            `Giro:  ${data.company.businessActivity || 'No especificado'}`,
            `Sector:  ${data.company.industry || 'No especificado'}`,
            `País:  ${data.company.country || 'No especificado'}`,
            `Moneda:  ${data.company.currency || 'No especificado'}`,
            `Ejercicios analizados:  ${yearLabels.join('  ·  ')}`,
            `Fecha de generación:  ${today}`,
          ].map(line =>
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [new TextRun({ text: line, size: 22, color: TEXT, font: 'Calibri' })],
            })
          ),

          new Paragraph({
            spacing: { before: 400, after: 80 },
            shading: { type: ShadingType.SOLID, color: GRAY },
            children: [new TextRun({ text: '  CONFIDENCIAL — Uso exclusivo del destinatario', size: 18, color: TEXT_S, font: 'Calibri', italics: true })],
          }),
        ],
      },

      // ── SECCIÓN 1: RESULTADOS ─────────────────────────────────────────────────
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
        children: [
          heading('1', 'ESTADO DE RESULTADOS'),
          spacer(),
          buildIncomeTable(data, years.slice().reverse()),
          spacer(),
          new Paragraph({
            children: [new TextRun({ text: `Cifras en ${data.company.currency || 'moneda local'}.`, size: 16, color: TEXT_S, font: 'Calibri', italics: true })],
          }),
          spacer(),
          subheading('Evolución de Resultados'),
          imgParagraph(revenueChart, 600, 270),
        ],
      },

      // ── SECCIÓN 2: BALANCE ────────────────────────────────────────────────────
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
        children: [
          heading('2', 'BALANCE DE SITUACIÓN'),
          spacer(),
          buildBalanceTable(data, years.slice().reverse()),
          spacer(),
          new Paragraph({
            children: [new TextRun({ text: `Cifras en ${data.company.currency || 'moneda local'}.`, size: 16, color: TEXT_S, font: 'Calibri', italics: true })],
          }),
          spacer(),
          subheading('Estructura Financiera'),
          imgParagraph(balanceChart, 600, 270),
        ],
      },

      // ── SECCIÓN 3: RATIOS ─────────────────────────────────────────────────────
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
        children: [
          heading('3', 'RATIOS FINANCIEROS'),
          spacer(),
          buildRatiosTable(data, years.slice().reverse()),
          spacer(),
          new Paragraph({
            children: [new TextRun({
              text: 'Z-Score Altman:  > 2.9 = Zona segura  |  1.23 – 2.9 = Zona gris  |  < 1.23 = Zona de alerta',
              size: 16, color: TEXT_S, font: 'Calibri', italics: true,
            })],
          }),
        ],
      },

      // ── SECCIÓN 4: ANALÍTICA — RESULTADOS Y ESTRUCTURA ───────────────────────
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
        children: [
          heading('4', 'ANALÍTICA — EVOLUCIÓN DE RESULTADOS Y ESTRUCTURA'),
          spacer(),
          subheading('Evolución de Resultados'),
          imgParagraph(revenueChart, 600, 270),
          spacer(),
          subheading('Estructura Financiera'),
          imgParagraph(balanceChart, 600, 270),
        ],
      },

      // ── SECCIÓN 5: ANALÍTICA — RENTABILIDAD Y LIQUIDEZ ───────────────────────
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
        children: [
          heading('5', 'ANALÍTICA — RENTABILIDAD Y LIQUIDEZ'),
          spacer(),
          subheading('Evolución de Rentabilidad'),
          imgParagraph(rentabilityChart, 600, 270),
          spacer(),
          subheading('Evolución de Liquidez'),
          imgParagraph(liquidityChart, 600, 270),
        ],
      },

      // ── SECCIÓN 6: ANALÍTICA — ENDEUDAMIENTO Y SOLVENCIA ─────────────────────
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
        children: [
          heading('6', 'ANALÍTICA — ENDEUDAMIENTO Y SOLVENCIA'),
          spacer(),
          subheading('Endeudamiento y Solvencia  (Deuda / Equity  ·  Deuda / Activo Total  ·  Deuda / EBITDA)'),
          imgParagraph(debtChart, 660, 320),
          spacer(),
          new Paragraph({
            children: [new TextRun({
              text: 'Referencias:  Deuda/Equity < 1.5  |  Deuda/Activo < 0.6  |  Deuda/EBITDA < 3×',
              size: 16, color: TEXT_S, font: 'Calibri', italics: true,
            })],
          }),
        ],
      },

      // ── SECCIÓN 7: ANALÍTICA — ACTIVIDAD Y EFICIENCIA ────────────────────────
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
        children: [
          heading('7', 'ANALÍTICA — ACTIVIDAD Y EFICIENCIA'),
          spacer(),
          subheading('Actividad Eficiencia 1 — Rotación de Activo'),
          imgParagraph(activity1Chart, 600, 270),
          spacer(),
          subheading('Actividad Eficiencia 2 — Días Promedio de Cobro y Días Promedio de Pago'),
          imgParagraph(activity2Chart, 600, 270),
          spacer(),
          new Paragraph({
            children: [new TextRun({
              text: 'Referencias:  Rotación Activo > 1.0×  |  Días de Cobro < 60  |  Días de Pago 60–90',
              size: 16, color: TEXT_S, font: 'Calibri', italics: true,
            })],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}
