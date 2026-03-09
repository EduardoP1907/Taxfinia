import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ─── Colors ────────────────────────────────────────────────────────────────
const COLOR_HEADER_BG = '#1a1a2e';   // Dark navy
const COLOR_SECTION_BG = '#16213e';  // Slightly lighter navy
const COLOR_ACCENT = '#4f46e5';      // Purple
const COLOR_LIGHT_ROW = '#f8f7ff';
const COLOR_WHITE = '#ffffff';
const COLOR_TEXT_DARK = '#1e1b4b';
const COLOR_TEXT_LIGHT = '#6b7280';
const COLOR_POSITIVE = '#059669';
const COLOR_NEGATIVE = '#dc2626';
const COLOR_BORDER = '#e0e0f0';

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmt(value: number | null | undefined, decimals = 0): string {
  if (value == null || isNaN(value)) return 'n/d';
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return 'n/d';
  return `${value.toFixed(decimals)}%`;
}

function fmtPctRaw(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'n/d';
  // value is already a percentage (e.g. 14.2)
  return `${value.toFixed(1)}%`;
}

function growthColor(doc: PDFKit.PDFDocument, value: number | null | undefined): void {
  if (value == null) { doc.fillColor(COLOR_TEXT_DARK); return; }
  doc.fillColor(value >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE);
}

export interface PDFReportData {
  company: {
    name: string;
    taxId?: string;
    industry?: string;
    businessActivity?: string;
    country?: string;
    currency?: string;
  };
  years: number[];
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
}

// ─── Page setup ────────────────────────────────────────────────────────────
const PAGE_WIDTH = 841.89;  // A4 landscape
const PAGE_HEIGHT = 595.28;
const MARGIN = 30;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function addPageHeader(doc: PDFKit.PDFDocument, title: string, company: string, pageNum: number, total: number): number {
  let y = MARGIN;

  // Background bar
  doc.rect(0, 0, PAGE_WIDTH, 50).fill(COLOR_HEADER_BG);

  // Left: Logo / Brand
  doc.fontSize(14).fillColor(COLOR_WHITE).font('Helvetica-Bold')
    .text('TAXFIN', MARGIN, 16, { continued: true })
    .fontSize(9).font('Helvetica').fillColor('#a5b4fc')
    .text(' | Servicio de Gestión Financiera', { continued: false });

  // Center: Company name
  doc.fontSize(11).fillColor(COLOR_WHITE).font('Helvetica-Bold')
    .text(company.toUpperCase(), 0, 18, { align: 'center', width: PAGE_WIDTH });

  // Right: Page number
  doc.fontSize(8).fillColor('#a5b4fc').font('Helvetica')
    .text(`CONFIDENCIAL  •  ${pageNum}/${total}`, PAGE_WIDTH - 170, 20, { width: 140, align: 'right' });

  y = 60;

  // Section title bar
  doc.rect(MARGIN, y, CONTENT_WIDTH, 22).fill(COLOR_ACCENT);
  doc.fontSize(11).fillColor(COLOR_WHITE).font('Helvetica-Bold')
    .text(title, MARGIN + 8, y + 5);

  return y + 32;
}

// ─── Table helper ──────────────────────────────────────────────────────────
function drawTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: { text: string; x: number; width: number; align?: 'left' | 'right' | 'center'; bold?: boolean; color?: string }[],
  rowHeight: number,
  bgColor?: string,
) {
  if (bgColor) {
    doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill(bgColor);
  }
  for (const col of cols) {
    const textColor = col.color || COLOR_TEXT_DARK;
    doc.fillColor(textColor)
      .fontSize(8)
      .font(col.bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(col.text, col.x, y + 3, { width: col.width, align: col.align || 'right' });
  }
  // Row border
  doc.strokeColor(COLOR_BORDER).lineWidth(0.3)
    .moveTo(MARGIN, y + rowHeight).lineTo(MARGIN + CONTENT_WIDTH, y + rowHeight).stroke();
  return y + rowHeight;
}

// ─── Section 1: Income Statement ───────────────────────────────────────────
function addIncomeStatementPage(doc: PDFKit.PDFDocument, data: PDFReportData, pageNum: number, totalPages: number) {
  doc.addPage({ layout: 'landscape', size: 'A4' });
  const years = data.years.slice().sort((a, b) => b - a).slice(0, 5);
  let y = addPageHeader(doc, '1. ESTADO DE RESULTADOS', data.company.name, pageNum, totalPages);

  // Column setup
  const labelW = 180;
  const colW = (CONTENT_WIDTH - labelW - 10) / (years.length * 2);
  const labelX = MARGIN + 5;

  // Header row (years)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 20).fill(COLOR_SECTION_BG);
  doc.fillColor(COLOR_WHITE).fontSize(8).font('Helvetica-Bold')
    .text('Concepto', labelX, y + 5, { width: labelW });

  years.forEach((yr, i) => {
    const xVal = MARGIN + labelW + 10 + i * colW * 2;
    const xPct = xVal + colW;
    doc.text(String(yr), xVal, y + 5, { width: colW, align: 'right' });
    doc.text('%', xPct, y + 5, { width: colW, align: 'right' });
  });
  y += 20;

  const rows = [
    { label: 'INGRESOS POR VENTAS', key: 'revenue', bold: true, pctBase: 'revenue' },
    { label: 'Coste de las Ventas', key: 'costOfSales', bold: false, pctBase: 'revenue', negate: true },
    { label: 'MARGEN BRUTO', key: 'grossMargin', bold: true, pctBase: 'grossMarginPct', isPctField: true },
    { label: 'Gastos de Administración', key: 'adminExpenses', bold: false, pctBase: 'revenue', negate: true },
    { label: 'EBITDA', key: 'ebitda', bold: true, pctBase: 'ebitdaPct', isPctField: true },
    { label: 'Depreciaciones', key: 'depreciation', bold: false, pctBase: 'revenue', negate: true },
    { label: 'RESULTADO EXPLOTACIÓN', key: 'operatingResult', bold: true, pctBase: 'operatingResultPct', isPctField: true },
    { label: 'Resultado Excepcional', key: 'exceptionalResult', bold: false, pctBase: 'revenue' },
    { label: 'Resultado Financiero', key: 'financialResult', bold: false, pctBase: 'revenue' },
    { label: 'B.A.I. (Beneficio Bruto)', key: 'ebt', bold: true, pctBase: 'ebtPct', isPctField: true },
    { label: 'Impuestos', key: 'incomeTax', bold: false, pctBase: 'revenue', negate: true },
    { label: 'BENEFICIO NETO', key: 'netIncome', bold: true, pctBase: 'netMarginPct', isPctField: true },
  ];

  rows.forEach((row, idx) => {
    const bg = row.bold ? COLOR_LIGHT_ROW : (idx % 2 === 0 ? COLOR_WHITE : '#fafaff');
    const cols: Parameters<typeof drawTableRow>[2] = [
      { text: row.label, x: labelX, width: labelW, align: 'left', bold: row.bold },
    ];
    years.forEach((yr, i) => {
      const d = data.incomeData[yr];
      const val = d ? (d as any)[row.key] as number : null;
      const pctVal = d ? (row.isPctField ? (d as any)[row.pctBase] : (d.revenue > 0 ? (d as any)[row.key] / d.revenue * 100 : null)) : null;
      const xVal = MARGIN + labelW + 10 + i * colW * 2;
      const xPct = xVal + colW;
      cols.push({ text: fmt(val), x: xVal, width: colW, align: 'right', bold: row.bold });
      cols.push({ text: pctVal != null ? fmtPct(pctVal) : 'n/d', x: xPct, width: colW, align: 'right', color: COLOR_TEXT_LIGHT });
    });
    y = drawTableRow(doc, y, cols, 16, bg);
  });

  // Note
  y += 6;
  doc.fontSize(7).fillColor(COLOR_TEXT_LIGHT).font('Helvetica')
    .text(`Cifras en ${data.company.currency || 'moneda local'}. Informe generado por TAXFIN IA.`, MARGIN, y);
}

// ─── Section 2: Balance Sheet ──────────────────────────────────────────────
function addBalancePage(doc: PDFKit.PDFDocument, data: PDFReportData, pageNum: number, totalPages: number) {
  doc.addPage({ layout: 'landscape', size: 'A4' });
  const years = data.years.slice().sort((a, b) => b - a).slice(0, 5);
  let y = addPageHeader(doc, '2. BALANCE DE SITUACIÓN', data.company.name, pageNum, totalPages);

  const labelW = 200;
  const colW = (CONTENT_WIDTH - labelW - 10) / (years.length * 2);
  const labelX = MARGIN + 5;

  // Header
  doc.rect(MARGIN, y, CONTENT_WIDTH, 20).fill(COLOR_SECTION_BG);
  doc.fillColor(COLOR_WHITE).fontSize(8).font('Helvetica-Bold').text('Concepto', labelX, y + 5, { width: labelW });
  years.forEach((yr, i) => {
    const xVal = MARGIN + labelW + 10 + i * colW * 2;
    const xPct = xVal + colW;
    doc.text(String(yr), xVal, y + 5, { width: colW, align: 'right' });
    doc.text('%', xPct, y + 5, { width: colW, align: 'right' });
  });
  y += 20;

  const rows = [
    { label: 'ACTIVO NO CORRIENTE', key: 'nonCurrentAssets', bold: true, section: 'assets' },
    { label: 'ACTIVO CORRIENTE', key: 'currentAssets', bold: true, section: 'assets' },
    { label: '  Existencias', key: 'inventory', bold: false, section: 'assets' },
    { label: '  Cuentas por Cobrar', key: 'accountsReceivable', bold: false, section: 'assets' },
    { label: '  Tesorería / Disponible', key: 'cash', bold: false, section: 'assets' },
    { label: 'TOTAL ACTIVO', key: 'totalAssets', bold: true, section: 'total' },
    { label: 'PATRIMONIO NETO', key: 'equity', bold: true, section: 'equity' },
    { label: 'PASIVO NO CORRIENTE', key: 'nonCurrentLiabilities', bold: true, section: 'liabilities' },
    { label: 'PASIVO CORRIENTE', key: 'currentLiabilities', bold: true, section: 'liabilities' },
    { label: 'TOTAL PASIVO + PATRIMONIO', key: 'totalAssets', bold: true, section: 'total' },
    { label: 'Fondo de Maniobra', key: 'workingCapital', bold: false, section: 'derived' },
  ];

  rows.forEach((row, idx) => {
    const bg = row.bold ? COLOR_LIGHT_ROW : (idx % 2 === 0 ? COLOR_WHITE : '#fafaff');
    const cols: Parameters<typeof drawTableRow>[2] = [
      { text: row.label, x: labelX, width: labelW, align: 'left', bold: row.bold },
    ];
    years.forEach((yr, i) => {
      const d = data.balanceData[yr];
      const val = d ? (d as any)[row.key] as number : null;
      const base = d?.totalAssets ?? 1;
      const pctVal = val != null && base > 0 ? val / base * 100 : null;
      const xVal = MARGIN + labelW + 10 + i * colW * 2;
      const xPct = xVal + colW;
      cols.push({ text: fmt(val), x: xVal, width: colW, align: 'right', bold: row.bold });
      cols.push({ text: pctVal != null ? fmtPct(pctVal) : 'n/d', x: xPct, width: colW, align: 'right', color: COLOR_TEXT_LIGHT });
    });
    y = drawTableRow(doc, y, cols, 16, bg);
  });
}

// ─── Section 3: Ratios ─────────────────────────────────────────────────────
function addRatiosPage(doc: PDFKit.PDFDocument, data: PDFReportData, pageNum: number, totalPages: number) {
  doc.addPage({ layout: 'landscape', size: 'A4' });
  const years = data.years.slice().sort((a, b) => b - a).slice(0, 5);
  let y = addPageHeader(doc, '3. RATIOS FINANCIEROS', data.company.name, pageNum, totalPages);

  const labelW = 200;
  const colW = (CONTENT_WIDTH - labelW - 10) / years.length;
  const labelX = MARGIN + 5;

  // Header
  doc.rect(MARGIN, y, CONTENT_WIDTH, 20).fill(COLOR_SECTION_BG);
  doc.fillColor(COLOR_WHITE).fontSize(8).font('Helvetica-Bold').text('Ratio', labelX, y + 5, { width: labelW });
  years.forEach((yr, i) => {
    const xVal = MARGIN + labelW + 10 + i * colW;
    doc.text(String(yr), xVal, y + 5, { width: colW, align: 'right' });
  });
  y += 20;

  // Group: Liquidez
  doc.rect(MARGIN, y, CONTENT_WIDTH, 14).fill(COLOR_ACCENT);
  doc.fillColor(COLOR_WHITE).fontSize(8).font('Helvetica-Bold').text('LIQUIDEZ', labelX, y + 3);
  y += 14;

  const liquidityRows = [
    { label: 'Ratio de Liquidez General', key: 'currentRatio', fmt: (v: number) => v.toFixed(2) },
    { label: 'Acid Test (Liquidez Inmediata)', key: 'quickRatio', fmt: (v: number) => v.toFixed(2) },
    { label: 'Ratio de Disponibilidad', key: 'cashRatio', fmt: (v: number) => v.toFixed(2) },
  ];

  liquidityRows.forEach((row, idx) => {
    const cols: Parameters<typeof drawTableRow>[2] = [
      { text: row.label, x: labelX, width: labelW, align: 'left' },
    ];
    years.forEach((yr, i) => {
      const d = data.ratiosData[yr];
      const val = d ? (d as any)[row.key] as number | null : null;
      const xVal = MARGIN + labelW + 10 + i * colW;
      cols.push({ text: val != null ? row.fmt(val) : 'n/d', x: xVal, width: colW, align: 'right' });
    });
    y = drawTableRow(doc, y, cols, 15, idx % 2 === 0 ? COLOR_WHITE : COLOR_LIGHT_ROW);
  });

  // Group: Endeudamiento
  y += 4;
  doc.rect(MARGIN, y, CONTENT_WIDTH, 14).fill(COLOR_ACCENT);
  doc.fillColor(COLOR_WHITE).fontSize(8).font('Helvetica-Bold').text('ENDEUDAMIENTO Y SOLVENCIA', labelX, y + 3);
  y += 14;

  const debtRows = [
    { label: 'Ratio Endeudamiento (Deuda/Equity)', key: 'debtToEquity', fmt: (v: number) => v.toFixed(2) },
    { label: 'Deuda / Activo Total', key: 'debtToAssets', fmt: (v: number) => v.toFixed(2) },
    { label: 'Deuda / EBITDA', key: 'debtToEbitda', fmt: (v: number) => v.toFixed(2) },
  ];

  debtRows.forEach((row, idx) => {
    const cols: Parameters<typeof drawTableRow>[2] = [
      { text: row.label, x: labelX, width: labelW, align: 'left' },
    ];
    years.forEach((yr, i) => {
      const d = data.ratiosData[yr];
      const val = d ? (d as any)[row.key] as number | null : null;
      const xVal = MARGIN + labelW + 10 + i * colW;
      cols.push({ text: val != null ? row.fmt(val) : 'n/d', x: xVal, width: colW, align: 'right' });
    });
    y = drawTableRow(doc, y, cols, 15, idx % 2 === 0 ? COLOR_WHITE : COLOR_LIGHT_ROW);
  });

  // Group: Rentabilidad
  y += 4;
  doc.rect(MARGIN, y, CONTENT_WIDTH, 14).fill(COLOR_ACCENT);
  doc.fillColor(COLOR_WHITE).fontSize(8).font('Helvetica-Bold').text('RENTABILIDAD', labelX, y + 3);
  y += 14;

  const profRows = [
    { label: 'ROE (Rentabilidad Financiera)', key: 'roe', fmt: (v: number) => fmtPct(v * 100) },
    { label: 'ROA (Rentabilidad Económica)', key: 'roa', fmt: (v: number) => fmtPct(v * 100) },
    { label: 'Margen Bruto', key: 'grossMargin', fmt: (v: number) => fmtPct(v * 100) },
    { label: 'Margen EBITDA', key: 'ebitdaMargin', fmt: (v: number) => fmtPct(v * 100) },
    { label: 'Margen Neto', key: 'netMargin', fmt: (v: number) => fmtPct(v * 100) },
  ];

  profRows.forEach((row, idx) => {
    const cols: Parameters<typeof drawTableRow>[2] = [
      { text: row.label, x: labelX, width: labelW, align: 'left' },
    ];
    years.forEach((yr, i) => {
      const d = data.ratiosData[yr];
      const val = d ? (d as any)[row.key] as number | null : null;
      const xVal = MARGIN + labelW + 10 + i * colW;
      cols.push({ text: val != null ? row.fmt(val) : 'n/d', x: xVal, width: colW, align: 'right' });
    });
    y = drawTableRow(doc, y, cols, 15, idx % 2 === 0 ? COLOR_WHITE : COLOR_LIGHT_ROW);
  });

  // Group: Actividad
  y += 4;
  doc.rect(MARGIN, y, CONTENT_WIDTH, 14).fill(COLOR_ACCENT);
  doc.fillColor(COLOR_WHITE).fontSize(8).font('Helvetica-Bold').text('ACTIVIDAD Y EFICIENCIA', labelX, y + 3);
  y += 14;

  const actRows = [
    { label: 'Rotación de Activo', key: 'assetTurnover', fmt: (v: number) => v.toFixed(2) },
    { label: 'Días Promedio de Cobro', key: 'daysSalesOutstanding', fmt: (v: number) => `${v.toFixed(1)} días` },
    { label: 'Días Promedio de Pago', key: 'daysPayableOutstanding', fmt: (v: number) => `${v.toFixed(1)} días` },
  ];

  actRows.forEach((row, idx) => {
    const cols: Parameters<typeof drawTableRow>[2] = [
      { text: row.label, x: labelX, width: labelW, align: 'left' },
    ];
    years.forEach((yr, i) => {
      const d = data.ratiosData[yr];
      const val = d ? (d as any)[row.key] as number | null : null;
      const xVal = MARGIN + labelW + 10 + i * colW;
      cols.push({ text: val != null ? row.fmt(val) : 'n/d', x: xVal, width: colW, align: 'right' });
    });
    y = drawTableRow(doc, y, cols, 15, idx % 2 === 0 ? COLOR_WHITE : COLOR_LIGHT_ROW);
  });

  // Altman Z-Score
  y += 4;
  doc.rect(MARGIN, y, CONTENT_WIDTH, 14).fill(COLOR_ACCENT);
  doc.fillColor(COLOR_WHITE).fontSize(8).font('Helvetica-Bold').text('RIESGO (ALTMAN Z-SCORE)', labelX, y + 3);
  y += 14;

  const zCols: Parameters<typeof drawTableRow>[2] = [
    { text: 'Z-Score de Altman', x: labelX, width: labelW, align: 'left' },
  ];
  years.forEach((yr, i) => {
    const d = data.ratiosData[yr];
    const val = d?.altmanZScore ?? null;
    const xVal = MARGIN + labelW + 10 + i * colW;
    const display = val != null ? val.toFixed(2) : 'n/d';
    const color = val == null ? COLOR_TEXT_DARK : val > 2.9 ? COLOR_POSITIVE : val < 1.23 ? COLOR_NEGATIVE : '#d97706';
    zCols.push({ text: display, x: xVal, width: colW, align: 'right', color });
  });
  y = drawTableRow(doc, y, zCols, 15, COLOR_LIGHT_ROW);

  // Z-score legend
  y += 8;
  doc.fontSize(7).fillColor(COLOR_TEXT_LIGHT)
    .text('Z-Score: > 2.9 = Zona segura  |  1.23 - 2.9 = Zona gris  |  < 1.23 = Zona de alerta', MARGIN, y);
}

// ─── Cover page ────────────────────────────────────────────────────────────
function addCoverPage(doc: PDFKit.PDFDocument, data: PDFReportData, totalPages: number) {
  doc.addPage({ layout: 'landscape', size: 'A4' });

  // Full background
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COLOR_HEADER_BG);

  // Decorative rectangle
  doc.rect(0, PAGE_HEIGHT - 80, PAGE_WIDTH, 80).fill(COLOR_ACCENT);

  // Brand
  doc.fontSize(28).fillColor(COLOR_WHITE).font('Helvetica-Bold')
    .text('TAXFIN', MARGIN, 60);
  doc.fontSize(12).fillColor('#a5b4fc').font('Helvetica')
    .text('Servicio de Gestión Financiera — Análisis Económico-Financiero', MARGIN, 96);

  // Divider
  doc.rect(MARGIN, 120, 200, 2).fill(COLOR_ACCENT);

  // Company name
  doc.fontSize(22).fillColor(COLOR_WHITE).font('Helvetica-Bold')
    .text(data.company.name.toUpperCase(), MARGIN, 140, { width: CONTENT_WIDTH });

  // Details
  const details = [
    `NIF/RUT: ${data.company.taxId || 'No especificado'}`,
    `Giro: ${data.company.businessActivity || 'No especificado'}`,
    `Sector: ${data.company.industry || 'No especificado'}`,
    `País: ${data.company.country || 'N/D'}`,
    `Ejercicios: ${data.years.slice().sort((a, b) => a - b).join(' · ')}`,
    `Moneda: ${data.company.currency || 'Local'}`,
  ];

  let detailY = 185;
  details.forEach(d => {
    doc.fontSize(10).fillColor('#c7d2fe').font('Helvetica').text(d, MARGIN, detailY);
    detailY += 18;
  });

  // Date
  const today = new Date();
  doc.fontSize(9).fillColor('#a5b4fc')
    .text(`Informe generado el ${today.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      MARGIN, PAGE_HEIGHT - 60);

  // Confidential
  doc.fontSize(9).fillColor(COLOR_WHITE).font('Helvetica-Bold')
    .text('CONFIDENCIAL — Uso exclusivo del destinatario', 0, PAGE_HEIGHT - 60, { align: 'center', width: PAGE_WIDTH });

  // Page count
  doc.fontSize(8).fillColor('#a5b4fc').font('Helvetica')
    .text(`${totalPages} secciones analíticas`, PAGE_WIDTH - MARGIN - 120, PAGE_HEIGHT - 60, { width: 120, align: 'right' });
}

// ─── Main export ───────────────────────────────────────────────────────────
export async function generateAnalyticalPDF(data: PDFReportData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const TOTAL_PAGES = 4; // cover + income + balance + ratios

    addCoverPage(doc, data, TOTAL_PAGES);
    addIncomeStatementPage(doc, data, 2, TOTAL_PAGES);
    addBalancePage(doc, data, 3, TOTAL_PAGES);
    addRatiosPage(doc, data, 4, TOTAL_PAGES);

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
