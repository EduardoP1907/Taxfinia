/**
 * docx-executive-summary.ts
 * Executive summary for board audiences — matches the design from reference PDF.
 * Sections: Dashboard KPI cards · Semáforo Estratégico · Visión General ·
 *           Evolución Gráfica · Alertas · Recomendaciones · Anexo financiero
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, PageOrientation,
  Header, Footer, PageNumber, ImageRun,
} from 'docx';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import fs from 'fs';
import type { AIAnalysisResult } from '../services/ai-analysis.service';
import type { PDFReportData } from './pdf-generator';

// ─── Palette ──────────────────────────────────────────────────────────────────
const NAVY    = '0f172a';
const AMBER   = 'f59e0b';
const WHITE   = 'ffffff';
const GRAY    = 'f8fafc';
const GRAY2   = 'e2e8f0';
const TEXT    = '1e293b';
const TEXT_S  = '64748b';
const GREEN   = '059669';
const GREEN_L = 'd1fae5';
const RED     = 'dc2626';
const RED_L   = 'fee2e2';

const chartCanvas = new ChartJSNodeCanvas({ width: 680, height: 260, backgroundColour: 'white' });

// ─── Chart helpers ────────────────────────────────────────────────────────────
async function barChart(
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
        title: { display: true, text: title, font: { size: 12, weight: 'bold' }, color: '#0f172a' },
        legend: { position: 'bottom', labels: { font: { size: 9 }, color: '#334155' } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#334155', font: { size: 9 } } },
        y: { grid: { color: '#e2e8f0' }, ticks: { color: '#334155', font: { size: 9 } } },
      },
    },
  } as any);
}

async function lineChart(
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
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: d.color,
        fill: true,
        tension: 0.3,
      })),
    },
    options: {
      responsive: false,
      plugins: {
        title: { display: true, text: title, font: { size: 12, weight: 'bold' }, color: '#0f172a' },
        legend: { position: 'bottom', labels: { font: { size: 9 }, color: '#334155' } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#334155', font: { size: 9 } } },
        y: { grid: { color: '#e2e8f0' }, ticks: { color: '#334155', font: { size: 9 } } },
      },
    },
  } as any);
}

// ─── Number formatting ────────────────────────────────────────────────────────
function n(v: number | null | undefined, dec = 0): string {
  if (v == null || isNaN(v)) return 'n/d';
  return new Intl.NumberFormat('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}
function pct(v: number | null | undefined, dec = 1): string {
  if (v == null || isNaN(v)) return 'n/d';
  return `${v.toFixed(dec)}%`;
}
function fmt(v: number | null | undefined, cur: string): string {
  if (v == null || isNaN(v)) return 'n/d';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (cur === 'CLP') {
    if (abs >= 1_000_000_000) return `${sign}MM$${(abs / 1_000_000_000).toFixed(1)}`;
    if (abs >= 1_000_000)     return `${sign}M$${(abs / 1_000_000).toFixed(1)}`;
    return `${sign}$${n(abs)}`;
  }
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  return `${sign}${n(abs)}`;
}
function trend(current: number | null | undefined, prev: number | null | undefined): string {
  if (current == null || prev == null || prev === 0) return '';
  const chg = ((current - prev) / Math.abs(prev)) * 100;
  const arrow = chg >= 0 ? '▲' : '▼';
  return `${arrow} ${Math.abs(chg).toFixed(1)}% vs año anterior`;
}
function trendColor(current: number | null | undefined, prev: number | null | undefined, higherIsBetter = true): string {
  if (current == null || prev == null) return TEXT_S;
  const better = higherIsBetter ? current >= prev : current <= prev;
  return better ? GREEN : RED;
}

// ─── Semaphore status ─────────────────────────────────────────────────────────
type Status = 'SALUDABLE' | 'ALERTA' | 'CRITICO';

function semaphore(value: number | null | undefined, indicator: string): { status: Status; bg: string; fg: string } {
  const saludable = { status: 'SALUDABLE' as Status, bg: GREEN_L, fg: GREEN };
  const alerta    = { status: 'ALERTA'    as Status, bg: RED_L,   fg: RED };
  const critico   = { status: 'CRITICO'   as Status, bg: RED_L,   fg: RED };
  if (value == null || isNaN(value)) return critico;

  switch (indicator) {
    case 'currentRatio':  return value >= 1.5 ? saludable : value >= 1.0 ? alerta : critico;
    case 'quickRatio':    return value >= 1.0 ? saludable : value >= 0.75 ? alerta : critico;
    case 'cashRatio':     return value >= 0.2 ? saludable : value >= 0.1 ? alerta : critico;
    case 'debtToAssets':  return value < 0.5 ? saludable : value < 0.6 ? alerta : critico;
    case 'debtToEbitda':  return value < 3 ? saludable : value < 5 ? alerta : critico;
    case 'altmanZScore':  return value > 2.9 ? saludable : value > 1.81 ? alerta : critico;
    case 'grossMargin':   return value > 20 ? saludable : value > 10 ? alerta : critico;
    case 'ebitdaMargin':  return value > 5 ? saludable : value > 0 ? alerta : critico;
    case 'netMargin':     return value > 0 ? saludable : value > -5 ? alerta : critico;
    case 'assetTurnover': return value > 1.0 ? saludable : value > 0.5 ? alerta : critico;
    case 'dso':           return value < 60 ? saludable : value < 90 ? alerta : critico;
    case 'dpo':           return (value >= 60 && value <= 90) ? saludable : critico;
    case 'roe':           return value > 10 ? saludable : value > 0 ? alerta : critico;
    case 'roa':           return value > 5 ? saludable : value > 0 ? alerta : critico;
    default: return alerta;
  }
}

// ─── DocX helpers ─────────────────────────────────────────────────────────────
function makeCell(
  text: string,
  opts: {
    bold?: boolean; bg?: string; color?: string; size?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    topBorderColor?: string; topBorderSize?: number;
    borderColor?: string;
  } = {},
): TableCell {
  const bc = opts.borderColor ?? GRAY2;
  const topBC = opts.topBorderColor ?? bc;
  const topBS = opts.topBorderSize ?? 1;
  return new TableCell({
    shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg } : undefined,
    borders: {
      top:    { style: BorderStyle.SINGLE, size: topBS, color: topBC },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: bc },
      left:   { style: BorderStyle.SINGLE, size: 1, color: bc },
      right:  { style: BorderStyle.SINGLE, size: 1, color: bc },
    },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.CENTER,
        children: [new TextRun({
          text,
          bold: opts.bold ?? false,
          size: opts.size ?? 18,
          color: opts.color ?? TEXT,
          font: 'Calibri',
        })],
      }),
    ],
  });
}

function hCell(text: string, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER): TableCell {
  return makeCell(text, { bold: true, bg: NAVY, color: WHITE, align, size: 17 });
}

function sectionCell(text: string, cols: number): TableCell {
  return new TableCell({
    columnSpan: cols,
    shading: { type: ShadingType.SOLID, color: GRAY2 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: GRAY2 },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: GRAY2 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
    },
    margins: { top: 50, bottom: 50, left: 120, right: 120 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 17, color: NAVY, font: 'Calibri' })],
    })],
  });
}

function spacer(after = 120): Paragraph {
  return new Paragraph({ spacing: { after } });
}

function imgPar(buf: Buffer, w: number, h: number): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 160 },
    children: [new ImageRun({ data: buf, transformation: { width: w, height: h }, type: 'png' } as any)],
  });
}

function sectionTitle(num: number, text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    shading: { type: ShadingType.SOLID, color: NAVY },
    children: [
      new TextRun({ text: `  ${num}  `, bold: true, size: 22, color: AMBER, font: 'Calibri' }),
      new TextRun({ text: ` ${text}  `, bold: true, size: 22, color: WHITE, font: 'Calibri' }),
    ],
  });
}

function subTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: 20, color: NAVY, font: 'Calibri' })],
  });
}

function para(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 80, before: 0 },
    children: [new TextRun({ text, bold: opts.bold ?? false, size: opts.size ?? 18, color: opts.color ?? TEXT, font: 'Calibri' })],
  });
}

// ─── AI text renderer ─────────────────────────────────────────────────────────
function renderAIText(text: string, type: 'alerts' | 'recommendations' | 'plain'): Paragraph[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    const isHeader = /^\[(NIVEL|PRIORIDAD):/.test(line) || /^\[CRITICO|ALTA|MEDIA|BAJA/.test(line);
    const isBullet = line.startsWith('-') || line.startsWith('•');

    let color = TEXT;
    if (type === 'alerts' && isHeader) {
      if (/CRITICA/i.test(line)) color = RED;
      else if (/ALTA/i.test(line)) color = RED;
      else if (/MEDIA/i.test(line)) color = RED;
      else color = GREEN;
    }
    if (type === 'recommendations' && isHeader) {
      if (/ALTA/i.test(line)) color = RED;
      else if (/MEDIA/i.test(line)) color = RED;
      else color = GREEN;
    }

    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: isHeader ? 100 : 60, before: isHeader ? 120 : 0 },
      indent: isBullet ? { left: 300 } : undefined,
      children: [new TextRun({ text: line, bold: isHeader, size: 18, color, font: 'Calibri' })],
    });
  });
}

// ─── Border helper ────────────────────────────────────────────────────────────
function borders(color: string, size = 1) {
  const s = { style: BorderStyle.SINGLE, size, color } as const;
  return { top: s, bottom: s, left: s, right: s };
}

// ─── Alert card parsing & rendering ──────────────────────────────────────────
interface AlertBlock {
  nivel: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  title: string;
  body: string;
  index: number;
}

function parseAlerts(text: string): AlertBlock[] {
  const blocks: AlertBlock[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let current: { nivel: AlertBlock['nivel']; title: string; bodyLines: string[] } | null = null;
  let idx = 1;
  for (const line of lines) {
    const m = line.match(/^\[NIVEL:\s*(CRITICA|ALTA|MEDIA|BAJA)\]\s*([^:]+):\s*(.*)/i);
    if (m) {
      if (current) blocks.push({ nivel: current.nivel, title: current.title, body: current.bodyLines.join(' ').trim(), index: idx++ });
      current = { nivel: m[1].toUpperCase() as AlertBlock['nivel'], title: m[2].trim(), bodyLines: [m[3].trim()] };
    } else if (current && line) {
      current.bodyLines.push(line);
    }
  }
  if (current) blocks.push({ nivel: current.nivel, title: current.title, body: current.bodyLines.join(' ').trim(), index: idx });
  return blocks;
}

function alertStyle(nivel: AlertBlock['nivel']): { bg: string; fg: string; label: string } {
  switch (nivel) {
    case 'CRITICA': return { bg: '7f1d1d', fg: WHITE, label: 'CRITICO' };
    case 'ALTA':    return { bg: 'dc2626', fg: WHITE, label: 'ALTA' };
    case 'MEDIA':   return { bg: 'dc2626', fg: WHITE, label: 'MEDIA' };
    case 'BAJA':    return { bg: '15803d', fg: WHITE, label: 'BAJA' };
  }
}

function buildAlertCards(alerts: AlertBlock[]): (Table | Paragraph)[] {
  const result: (Table | Paragraph)[] = [];
  for (const alert of alerts) {
    const { bg, fg, label } = alertStyle(alert.nivel);
    const headerText = `[${label}] ALERTA ${alert.index} — ${alert.title.toUpperCase()}`;
    result.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 32, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: bg },
              borders: borders(bg),
              margins: { top: 120, bottom: 120, left: 160, right: 120 },
              children: [new Paragraph({
                children: [new TextRun({ text: headerText, bold: true, size: 18, color: fg, font: 'Calibri' })],
              })],
            }),
            new TableCell({
              width: { size: 68, type: WidthType.PERCENTAGE },
              borders: borders(GRAY2),
              margins: { top: 100, bottom: 100, left: 160, right: 140 },
              children: [new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                children: [new TextRun({ text: alert.body, size: 17, color: TEXT, font: 'Calibri' })],
              })],
            }),
          ],
        }),
      ],
    }));
    result.push(spacer(60));
  }
  return result;
}

// ─── Recommendation card parsing & rendering ──────────────────────────────────
interface RecommendationBlock {
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  area: string;
  body: string;
  horizonte: string;
  index: number;
}

function parseRecommendations(text: string): RecommendationBlock[] {
  const blocks: RecommendationBlock[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let current: { priority: RecommendationBlock['priority']; area: string; bodyLines: string[] } | null = null;
  let idx = 1;
  for (const line of lines) {
    const m = line.match(/^\[PRIORIDAD:\s*(ALTA|MEDIA|BAJA)\]\s*([^:]+):\s*(.*)/i);
    if (m) {
      if (current) blocks.push(finalizeRec(current, idx++));
      current = { priority: m[1].toUpperCase() as RecommendationBlock['priority'], area: m[2].trim(), bodyLines: [m[3].trim()] };
    } else if (current && line) {
      current.bodyLines.push(line);
    }
  }
  if (current) blocks.push(finalizeRec(current, idx));
  return blocks;
}

function finalizeRec(
  cur: { priority: RecommendationBlock['priority']; area: string; bodyLines: string[] },
  idx: number,
): RecommendationBlock {
  const body = cur.bodyLines.join(' ').trim();
  let horizonte = '';
  const m = body.match(/[Pp]lazo:\s*([^.]+)/);
  if (m) {
    const p = m[1].trim().toLowerCase();
    if (p.includes('corto'))        horizonte = '≤ 90 días';
    else if (p.includes('mediano')) horizonte = '3-12 meses';
    else if (p.includes('largo'))   horizonte = '1-3 años';
    else                            horizonte = m[1].trim();
  }
  return { priority: cur.priority, area: cur.area, body, horizonte, index: idx };
}

function recStyle(priority: RecommendationBlock['priority']): {
  headerBg: string; headerFg: string; titleBg: string; label: string;
} {
  switch (priority) {
    case 'ALTA':  return { headerBg: 'dc2626', headerFg: WHITE, titleBg: 'fee2e2', label: 'PRIORIDAD: ALTA' };
    case 'MEDIA': return { headerBg: 'dc2626', headerFg: WHITE, titleBg: 'fee2e2', label: 'PRIORIDAD: MEDIA' };
    case 'BAJA':  return { headerBg: '16a34a', headerFg: WHITE, titleBg: 'dcfce7', label: 'PRIORIDAD: BAJA' };
  }
}

function buildRecommendationCards(recs: RecommendationBlock[]): (Table | Paragraph)[] {
  const result: (Table | Paragraph)[] = [];
  for (const rec of recs) {
    const s = recStyle(rec.priority);
    result.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Row 1 — RECOMENDACION X | PRIORIDAD badge | Horizonte
        new TableRow({
          cantSplit: true,   // row won't break mid-row across pages
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: NAVY },
              borders: borders(NAVY),
              margins: { top: 90, bottom: 90, left: 160, right: 120 },
              children: [new Paragraph({
                keepNext: true,  // keep header row tied to title row
                children: [new TextRun({ text: `RECOMENDACION ${rec.index}`, bold: true, size: 18, color: WHITE, font: 'Calibri' })],
              })],
            }),
            new TableCell({
              width: { size: 42, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: s.headerBg },
              borders: borders(s.headerBg),
              margins: { top: 90, bottom: 90, left: 120, right: 120 },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                keepNext: true,
                children: [new TextRun({ text: s.label, bold: true, size: 18, color: s.headerFg, font: 'Calibri' })],
              })],
            }),
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: GRAY },
              borders: borders(GRAY2),
              margins: { top: 90, bottom: 90, left: 120, right: 140 },
              children: [new Paragraph({
                alignment: AlignmentType.RIGHT,
                keepNext: true,
                children: [new TextRun({ text: rec.horizonte ? `Horizonte: ${rec.horizonte}` : ' ', size: 16, color: TEXT_S, font: 'Calibri' })],
              })],
            }),
          ],
        }),
        // Row 2 — area title with priority-tinted background
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              columnSpan: 3,
              shading: { type: ShadingType.SOLID, color: s.titleBg },
              borders: borders(GRAY2),
              margins: { top: 90, bottom: 90, left: 160, right: 140 },
              children: [new Paragraph({
                keepNext: true,  // keep title row tied to body row
                children: [new TextRun({ text: rec.area.toUpperCase(), bold: true, size: 19, color: TEXT, font: 'Calibri' })],
              })],
            }),
          ],
        }),
        // Row 3 — body text
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              columnSpan: 3,
              borders: borders(GRAY2),
              margins: { top: 90, bottom: 110, left: 160, right: 140 },
              children: [new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                children: [new TextRun({ text: rec.body, size: 17, color: TEXT, font: 'Calibri' })],
              })],
            }),
          ],
        }),
      ],
    }));
    result.push(spacer(100));
  }
  return result;
}

// ─── KPI Dashboard cards ──────────────────────────────────────────────────────
function buildKpiDashboard(data: PDFReportData, years: number[], cur: string): Table[] {
  const ly = years[years.length - 1];
  const py = years[years.length - 2] ?? null;

  type KpiCard = {
    label: string;
    value: string;
    trendStr: string;
    trendClr: string;
    semKey: string;
    rawCurr?: number | null;
    rawPrev?: number | null;
    higherIsBetter?: boolean;
  };

  const cards: KpiCard[] = [
    {
      label: 'Ingresos por Ventas',
      value: fmt(data.incomeData[ly]?.revenue, cur),
      trendStr: trend(data.incomeData[ly]?.revenue, py ? data.incomeData[py]?.revenue : null),
      trendClr: trendColor(data.incomeData[ly]?.revenue, py ? data.incomeData[py]?.revenue : null),
      semKey: 'none',
    },
    {
      label: 'EBITDA',
      value: fmt(data.incomeData[ly]?.ebitda, cur),
      trendStr: trend(data.incomeData[ly]?.ebitda, py ? data.incomeData[py]?.ebitda : null),
      trendClr: trendColor(data.incomeData[ly]?.ebitda, py ? data.incomeData[py]?.ebitda : null),
      semKey: 'ebitdaValue',
    },
    {
      label: 'Beneficio Neto',
      value: fmt(data.incomeData[ly]?.netIncome, cur),
      trendStr: trend(data.incomeData[ly]?.netIncome, py ? data.incomeData[py]?.netIncome : null),
      trendClr: trendColor(data.incomeData[ly]?.netIncome, py ? data.incomeData[py]?.netIncome : null),
      semKey: 'netIncome',
    },
    {
      label: 'Margen EBITDA',
      value: pct(data.incomeData[ly]?.ebitdaPct),
      trendStr: trend(data.incomeData[ly]?.ebitdaPct, py ? data.incomeData[py]?.ebitdaPct : null),
      trendClr: trendColor(data.incomeData[ly]?.ebitdaPct, py ? data.incomeData[py]?.ebitdaPct : null),
      semKey: 'ebitdaMargin',
      rawCurr: data.ratiosData[ly]?.ebitdaMargin,
      rawPrev: py ? data.ratiosData[py]?.ebitdaMargin : null,
    },
    {
      label: 'Liquidez General',
      value: data.ratiosData[ly]?.currentRatio != null ? `${data.ratiosData[ly]!.currentRatio!.toFixed(2)}x` : 'n/d',
      trendStr: trend(data.ratiosData[ly]?.currentRatio, py ? data.ratiosData[py]?.currentRatio : null),
      trendClr: trendColor(data.ratiosData[ly]?.currentRatio, py ? data.ratiosData[py]?.currentRatio : null),
      semKey: 'currentRatio',
      rawCurr: data.ratiosData[ly]?.currentRatio,
      rawPrev: py ? data.ratiosData[py]?.currentRatio : null,
    },
    {
      label: 'Deuda Total',
      value: fmt(data.balanceData[ly]?.totalDebt, cur),
      trendStr: trend(data.balanceData[ly]?.totalDebt, py ? data.balanceData[py]?.totalDebt : null),
      trendClr: trendColor(data.balanceData[ly]?.totalDebt, py ? data.balanceData[py]?.totalDebt : null, false),
      semKey: 'none',
    },
    {
      label: 'ROE',
      value: pct(data.ratiosData[ly]?.roe),
      trendStr: trend(data.ratiosData[ly]?.roe, py ? data.ratiosData[py]?.roe : null),
      trendClr: trendColor(data.ratiosData[ly]?.roe, py ? data.ratiosData[py]?.roe : null),
      semKey: 'roe',
      rawCurr: data.ratiosData[ly]?.roe,
    },
    {
      label: 'Altman Z-Score',
      value: data.ratiosData[ly]?.altmanZScore != null ? data.ratiosData[ly]!.altmanZScore!.toFixed(2) : 'n/d',
      trendStr: trend(data.ratiosData[ly]?.altmanZScore, py ? data.ratiosData[py]?.altmanZScore : null),
      trendClr: trendColor(data.ratiosData[ly]?.altmanZScore, py ? data.ratiosData[py]?.altmanZScore : null),
      semKey: 'altmanZScore',
      rawCurr: data.ratiosData[ly]?.altmanZScore,
    },
    {
      label: 'Días Cobro (DSO)',
      value: data.ratiosData[ly]?.daysSalesOutstanding != null ? `${Math.round(data.ratiosData[ly]!.daysSalesOutstanding!)} d` : 'n/d',
      trendStr: trend(data.ratiosData[ly]?.daysSalesOutstanding, py ? data.ratiosData[py]?.daysSalesOutstanding : null),
      trendClr: trendColor(data.ratiosData[ly]?.daysSalesOutstanding, py ? data.ratiosData[py]?.daysSalesOutstanding : null, false),
      semKey: 'dso',
      rawCurr: data.ratiosData[ly]?.daysSalesOutstanding,
    },
    {
      label: 'Días Pago (DPO)',
      value: data.ratiosData[ly]?.daysPayableOutstanding != null ? `${Math.round(data.ratiosData[ly]!.daysPayableOutstanding!)} d` : 'n/d',
      trendStr: trend(data.ratiosData[ly]?.daysPayableOutstanding, py ? data.ratiosData[py]?.daysPayableOutstanding : null),
      trendClr: trendColor(data.ratiosData[ly]?.daysPayableOutstanding, py ? data.ratiosData[py]?.daysPayableOutstanding : null),
      semKey: 'dpo',
      rawCurr: data.ratiosData[ly]?.daysPayableOutstanding,
    },
    {
      label: 'ROA',
      value: pct(data.ratiosData[ly]?.roa),
      trendStr: trend(data.ratiosData[ly]?.roa, py ? data.ratiosData[py]?.roa : null),
      trendClr: trendColor(data.ratiosData[ly]?.roa, py ? data.ratiosData[py]?.roa : null),
      semKey: 'roa',
      rawCurr: data.ratiosData[ly]?.roa,
    },
    {
      label: 'Fondo de Maniobra',
      value: fmt(data.balanceData[ly]?.workingCapital, cur),
      trendStr: trend(data.balanceData[ly]?.workingCapital, py ? data.balanceData[py]?.workingCapital : null),
      trendClr: trendColor(data.balanceData[ly]?.workingCapital, py ? data.balanceData[py]?.workingCapital : null),
      semKey: 'none',
    },
  ];

  // Build 3 rows of 4 cards each
  const rows: Table[] = [];
  for (let r = 0; r < 3; r++) {
    const rowCards = cards.slice(r * 4, r * 4 + 4);
    const tableRow = new TableRow({
      children: rowCards.map(card => {
        const sem = card.semKey !== 'none' ? semaphore(card.rawCurr ?? undefined, card.semKey) : null;
        const topColor = sem ? sem.fg : AMBER;
        return new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 12, color: topColor },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: GRAY2 },
            left: { style: BorderStyle.SINGLE, size: 1, color: GRAY2 },
            right: { style: BorderStyle.SINGLE, size: 1, color: GRAY2 },
          },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: card.value, bold: true, size: 28, color: topColor, font: 'Calibri' })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [new TextRun({ text: card.trendStr || ' ', size: 15, color: card.trendClr, font: 'Calibri' })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: card.label, size: 16, color: TEXT_S, font: 'Calibri' })],
            }),
          ],
        });
      }),
    });
    rows.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [tableRow],
    }));
  }
  return rows;
}

// ─── Semáforo Estratégico table ───────────────────────────────────────────────
function buildSemaforoTable(data: PDFReportData, years: number[]): Table {
  const ly = years[years.length - 1];
  const py = years[years.length - 2] ?? null;

  type SemaRow = {
    label: string;
    key: string;
    getValue: (y: number) => string;
    referencia: string;
    higherIsBetter: boolean;
  };

  const groups: { title: string; rows: SemaRow[] }[] = [
    {
      title: 'LIQUIDEZ',
      rows: [
        { label: 'Liquidez General', key: 'currentRatio', getValue: y => data.ratiosData[y]?.currentRatio != null ? `${data.ratiosData[y]!.currentRatio!.toFixed(2)}x` : 'n/d', referencia: '≥ 1.0x', higherIsBetter: true },
        { label: 'Acid Test', key: 'quickRatio', getValue: y => data.ratiosData[y]?.quickRatio != null ? `${data.ratiosData[y]!.quickRatio!.toFixed(2)}x` : 'n/d', referencia: '≥ 1.0x', higherIsBetter: true },
        { label: 'Ratio Disponibilidad', key: 'cashRatio', getValue: y => data.ratiosData[y]?.cashRatio != null ? `${data.ratiosData[y]!.cashRatio!.toFixed(2)}x` : 'n/d', referencia: '≥ 0.2x', higherIsBetter: true },
      ],
    },
    {
      title: 'ENDEUDAMIENTO Y SOLVENCIA',
      rows: [
        { label: 'Deuda / Activo Total', key: 'debtToAssets', getValue: y => data.ratiosData[y]?.debtToAssets != null ? `${(data.ratiosData[y]!.debtToAssets! * 100).toFixed(1)}%` : 'n/d', referencia: '< 60%', higherIsBetter: false },
        { label: 'Deuda / EBITDA', key: 'debtToEbitda', getValue: y => data.ratiosData[y]?.debtToEbitda != null ? `${data.ratiosData[y]!.debtToEbitda!.toFixed(1)}x` : 'N/A', referencia: '< 3x', higherIsBetter: false },
        { label: 'Altman Z-Score', key: 'altmanZScore', getValue: y => data.ratiosData[y]?.altmanZScore != null ? data.ratiosData[y]!.altmanZScore!.toFixed(2) : 'n/d', referencia: '> 1.81', higherIsBetter: true },
      ],
    },
    {
      title: 'RENTABILIDAD',
      rows: [
        { label: 'Margen Bruto', key: 'grossMargin', getValue: y => data.ratiosData[y]?.grossMargin != null ? `${data.ratiosData[y]!.grossMargin!.toFixed(1)}%` : 'n/d', referencia: '> 20%', higherIsBetter: true },
        { label: 'Margen EBITDA', key: 'ebitdaMargin', getValue: y => data.ratiosData[y]?.ebitdaMargin != null ? `${data.ratiosData[y]!.ebitdaMargin!.toFixed(1)}%` : 'n/d', referencia: '> 0%', higherIsBetter: true },
        { label: 'Margen Neto', key: 'netMargin', getValue: y => data.ratiosData[y]?.netMargin != null ? `${data.ratiosData[y]!.netMargin!.toFixed(1)}%` : 'n/d', referencia: '> 0%', higherIsBetter: true },
      ],
    },
    {
      title: 'ACTIVIDAD',
      rows: [
        { label: 'Rotación de Activo', key: 'assetTurnover', getValue: y => data.ratiosData[y]?.assetTurnover != null ? `${data.ratiosData[y]!.assetTurnover!.toFixed(2)}x` : 'n/d', referencia: '> 1.0x', higherIsBetter: true },
        { label: 'DSO — Días de Cobro', key: 'dso', getValue: y => data.ratiosData[y]?.daysSalesOutstanding != null ? `${Math.round(data.ratiosData[y]!.daysSalesOutstanding!)} d` : 'n/d', referencia: '< 60 d', higherIsBetter: false },
        { label: 'DPO — Días de Pago', key: 'dpo', getValue: y => data.ratiosData[y]?.daysPayableOutstanding != null ? `${Math.round(data.ratiosData[y]!.daysPayableOutstanding!)} d` : 'n/d', referencia: '60-90 d', higherIsBetter: true },
      ],
    },
  ];

  // Column widths: Indicador(32%) | curYear(10%) | prevYear(10%) | Referencia(12%) | Estado(16%) | Tendencia(20%)
  const colWidths = [3200, 1000, 1000, 1200, 1600, 2000]; // in DXA (twentieths of a point)

  const tableRows: TableRow[] = [
    // Header
    new TableRow({
      tableHeader: true,
      children: [
        hCell('Indicador', AlignmentType.LEFT),
        hCell(String(ly)),
        hCell(py ? String(py) : 'Ant.'),
        hCell('Referencia'),
        hCell('Estado'),
        hCell('Tendencia'),
      ],
    }),
  ];

  for (const group of groups) {
    tableRows.push(new TableRow({
      children: [sectionCell(group.title, 6)],
    }));

    for (const row of group.rows) {
      const currVal = (data.ratiosData[ly] as any)?.[
        row.key === 'dso' ? 'daysSalesOutstanding' :
        row.key === 'dpo' ? 'daysPayableOutstanding' :
        row.key === 'grossMargin' ? 'grossMargin' :
        row.key === 'ebitdaMargin' ? 'ebitdaMargin' :
        row.key === 'netMargin' ? 'netMargin' :
        row.key
      ] as number | null;
      const prevVal = py ? (data.ratiosData[py] as any)?.[
        row.key === 'dso' ? 'daysSalesOutstanding' :
        row.key === 'dpo' ? 'daysPayableOutstanding' :
        row.key
      ] as number | null : null;

      const sem = semaphore(currVal, row.key);

      // Compute trend description
      let tendencia = '';
      if (currVal != null && prevVal != null) {
        const better = row.higherIsBetter ? currVal > prevVal : currVal < prevVal;
        const arrow = row.higherIsBetter ? (currVal > prevVal ? '▲' : '▼') : (currVal < prevVal ? '▲' : '▼');
        const desc = better ? 'Mejora' : 'Deterioro';
        const chgPct = Math.abs(((currVal - prevVal) / Math.abs(prevVal || 1)) * 100).toFixed(0);
        tendencia = `${arrow} ${desc} ${chgPct}%`;
      } else if (prevVal == null) {
        tendencia = 'Sin comparativo';
      }

      // Build a multi-year trend over all available years
      const firstYear = years[0];
      const firstVal = (data.ratiosData[firstYear] as any)?.[row.key === 'dso' ? 'daysSalesOutstanding' : row.key === 'dpo' ? 'daysPayableOutstanding' : row.key] as number | null;
      if (currVal != null && firstVal != null && firstYear !== ly && years.length > 2) {
        const better = row.higherIsBetter ? currVal > firstVal : currVal < firstVal;
        const arrow = better ? '▲' : '▼';
        const desc = better ? 'Mejora' : 'Deterioro';
        tendencia = `${arrow} ${desc} desde ${firstYear}`;
      }

      tableRows.push(new TableRow({
        children: [
          makeCell(row.label, { align: AlignmentType.LEFT, size: 17 }),
          makeCell(row.getValue(ly), { size: 17 }),
          makeCell(py ? row.getValue(py) : '—', { size: 17 }),
          makeCell(row.referencia, { size: 17 }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: sem.bg },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: GRAY2 },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: GRAY2 },
              left: { style: BorderStyle.SINGLE, size: 1, color: GRAY2 },
              right: { style: BorderStyle.SINGLE, size: 1, color: GRAY2 },
            },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: sem.status, bold: true, size: 16, color: sem.fg, font: 'Calibri' })],
            })],
          }),
          makeCell(tendencia, { size: 15, color: TEXT_S }),
        ],
      }));
    }
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateExecutiveSummaryDocx(
  data: PDFReportData,
  aiAnalysis: AIAnalysisResult,
  outputPath: string,
): Promise<void> {
  const cur = data.company.currency || 'CLP';
  const years = data.years.slice().sort((a, b) => a - b);
  const latestYear = years[years.length - 1];
  const yearLabels = years.map(String);
  const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  const revenueChart = await barChart(
    yearLabels,
    [
      { label: 'Ingresos',   data: years.map(y => data.incomeData[y]?.revenue ?? null),   color: '#0f172a' },
      { label: 'EBITDA',     data: years.map(y => data.incomeData[y]?.ebitda ?? null),    color: '#f59e0b' },
      { label: 'Bº Neto',   data: years.map(y => data.incomeData[y]?.netIncome ?? null), color: '#059669' },
    ],
    'Evolución de Resultados',
  );

  const rentabilityChart = await lineChart(
    yearLabels,
    [
      { label: 'ROE (%)',         data: years.map(y => data.ratiosData[y]?.roe ?? null),         color: '#0f172a' },
      { label: 'Margen EBITDA (%)', data: years.map(y => data.ratiosData[y]?.ebitdaMargin ?? null), color: '#f59e0b' },
      { label: 'Margen Neto (%)', data: years.map(y => data.ratiosData[y]?.netMargin ?? null), color: '#059669' },
    ],
    'Rentabilidad',
  );

  const kpiTables = buildKpiDashboard(data, years, cur);
  const semaforoTable = buildSemaforoTable(data, years);

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.PORTRAIT } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: AMBER } },
                children: [
                  new TextRun({ text: `${data.company.name} — INFORME EJECUTIVO DE DIRECTORIO | CONFIDENCIAL`, size: 15, color: TEXT_S, font: 'Calibri' }),
                  new TextRun({ text: `\t${today}`, size: 15, color: TEXT_S, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: AMBER } },
                children: [
                  new TextRun({ text: 'Página ', size: 15, color: TEXT_S, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 15, color: TEXT_S, font: 'Calibri' }),
                  new TextRun({ text: ' · Confidencial · PROMETHEIA', size: 15, color: TEXT_S, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ── COVER ──────────────────────────────────────────────────────────
          new Paragraph({
            shading: { type: ShadingType.SOLID, color: NAVY },
            spacing: { before: 0, after: 0 },
            children: [new TextRun({ text: ' ', size: 6, font: 'Calibri' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 60 },
            children: [new TextRun({ text: 'INFORME EJECUTIVO DE DIRECTORIO', bold: true, size: 38, color: NAVY, font: 'Calibri' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: data.company.name, bold: true, size: 30, color: AMBER, font: 'Calibri' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: `Análisis financiero · Período ${years[0]}–${latestYear}`, size: 20, color: TEXT_S, font: 'Calibri' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: `Preparado por PROMETHEIA · ${today}`, size: 18, color: TEXT_S, font: 'Calibri' })],
          }),

          // ── SECTION 1: DASHBOARD EJECUTIVO ─────────────────────────────────
          sectionTitle(1, `DASHBOARD EJECUTIVO — AÑO BASE ${latestYear}`),
          spacer(80),
          para(`Resumen de los indicadores financieros clave del ejercicio ${latestYear}. El semáforo superior de cada tarjeta indica el estado del indicador: rojo = zona crítica o de alerta, verde = saludable.`),
          spacer(80),
          ...kpiTables.map(t => t as any),
          spacer(80),

          // ── SECTION 2: SEMÁFORO ESTRATÉGICO ────────────────────────────────
          sectionTitle(2, `SEMÁFORO ESTRATÉGICO ${latestYear}`),
          spacer(80),
          semaforoTable,
          spacer(80),

          // ── SECTION 3: EVOLUCIÓN GRÁFICA ────────────────────────────────────
          sectionTitle(3, 'EVOLUCIÓN GRÁFICA'),
          spacer(60),
          subTitle('Estado de Resultados'),
          imgPar(revenueChart, 510, 200),
          subTitle('Rentabilidad (%)'),
          imgPar(rentabilityChart, 510, 200),
          spacer(80),

          // ── SECTION 4: ALERTAS ESTRATÉGICAS ────────────────────────────────
          sectionTitle(4, 'ALERTAS ESTRATÉGICAS'),
          spacer(80),
          para('Las siguientes alertas han sido identificadas a partir del análisis comparativo y evolutivo de los estados financieros, ordenadas por criticidad. Cada alerta requiere pronunciamiento expreso del directorio.'),
          spacer(60),
          ...buildAlertCards(parseAlerts(aiAnalysis.strategicAlerts)),
          spacer(80),

          // ── SECTION 5: RECOMENDACIONES ──────────────────────────────────────
          sectionTitle(5, 'RECOMENDACIONES PRIORIZADAS PARA EL DIRECTORIO'),
          spacer(80),
          para('Las siguientes recomendaciones están ordenadas por prioridad estratégica y basadas en el análisis integral de la posición y tendencia financiera de la empresa. Incluyen horizonte temporal orientativo para cada acción.'),
          spacer(60),
          ...buildRecommendationCards(parseRecommendations(aiAnalysis.prioritizedRecommendations)),
          spacer(80),

          spacer(80),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}
