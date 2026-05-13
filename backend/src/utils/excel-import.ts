/**
 * excel-import.ts
 * Parses CSV/XLSX financial data files and generates the import template.
 */

import * as XLSX from 'xlsx';

// ─── Field mapping: normalized Spanish label → DB table + field ───────────────
const FIELD_MAP: Record<string, { table: 'balance' | 'income' | 'cashflow' | 'additional'; field: string }> = {
  // Balance – non-current assets
  'inmovilizado material':          { table: 'balance', field: 'tangibleAssets' },
  'inmovilizado inmaterial':        { table: 'balance', field: 'intangibleAssets' },
  'inversiones financieras lp':     { table: 'balance', field: 'financialInvestmentsLp' },
  'otro activo no corriente':       { table: 'balance', field: 'otherNoncurrentAssets' },
  // Balance – current assets
  'existencias':                    { table: 'balance', field: 'inventory' },
  'clientes':                       { table: 'balance', field: 'accountsReceivable' },
  'otros deudores':                 { table: 'balance', field: 'otherReceivables' },
  'deudores fiscales':              { table: 'balance', field: 'taxReceivables' },
  'efectivo y equivalentes':        { table: 'balance', field: 'cashEquivalents' },
  // Balance – equity
  'capital social':                 { table: 'balance', field: 'shareCapital' },
  'reservas':                       { table: 'balance', field: 'reserves' },
  'resultados acumulados':          { table: 'balance', field: 'retainedEarnings' },
  'acciones propias':               { table: 'balance', field: 'treasuryStock' },
  // Balance – non-current liabilities
  'provisiones lp':                 { table: 'balance', field: 'provisionsLp' },
  'deudas lp':                      { table: 'balance', field: 'bankDebtLp' },
  'otras deudas lp':                { table: 'balance', field: 'otherLiabilitiesLp' },
  // Balance – current liabilities
  'provisiones cp':                 { table: 'balance', field: 'provisionsSp' },
  'deudas cp':                      { table: 'balance', field: 'bankDebtSp' },
  'proveedores':                    { table: 'balance', field: 'accountsPayable' },
  'pasivos fiscales cp':            { table: 'balance', field: 'taxLiabilities' },
  'otras deudas cp':                { table: 'balance', field: 'otherLiabilitiesSp' },
  // Income statement
  'ingresos por ventas':            { table: 'income', field: 'revenue' },
  'otros ingresos de explotacion':  { table: 'income', field: 'otherOperatingIncome' },
  'coste de ventas':                { table: 'income', field: 'costOfSales' },
  'coste personal ventas':          { table: 'income', field: 'staffCostsSales' },
  'gastos administracion':          { table: 'income', field: 'adminExpenses' },
  'gastos personal admin':          { table: 'income', field: 'staffCostsAdmin' },
  'amortizaciones':                 { table: 'income', field: 'depreciation' },
  'ingresos excepcionales':         { table: 'income', field: 'exceptionalIncome' },
  'gastos excepcionales':           { table: 'income', field: 'exceptionalExpenses' },
  'ingresos financieros':           { table: 'income', field: 'financialIncome' },
  'gastos financieros':             { table: 'income', field: 'financialExpenses' },
  'impuesto sociedades':            { table: 'income', field: 'incomeTax' },
  // Cash flow
  'flujo caja operativo':           { table: 'cashflow', field: 'operatingCashFlow' },
  'ajustes ebt':                    { table: 'cashflow', field: 'cfEbtAdjustments' },
  'variacion capital circulante':   { table: 'cashflow', field: 'cfWorkingCapital' },
  'inversiones pagos':              { table: 'cashflow', field: 'cfInvestments' },
  'desinversiones cobros':          { table: 'cashflow', field: 'cfDivestments' },
  'financiacion obtenida':          { table: 'cashflow', field: 'cfDebtObtained' },
  'financiacion repagada':          { table: 'cashflow', field: 'cfDebtRepaid' },
  'dividendos pagados':             { table: 'cashflow', field: 'cfDividendsPaid' },
  // Additional data
  'empleados promedio':             { table: 'additional', field: 'averageEmployees' },
  'numero de acciones':             { table: 'additional', field: 'sharesOutstanding' },
  'precio por accion':              { table: 'additional', field: 'sharePrice' },
  'dividendo por accion':           { table: 'additional', field: 'dividendsPerShare' },
};

export type YearRecord = {
  balance:    Record<string, number>;
  income:     Record<string, number>;
  cashflow:   Record<string, number>;
  additional: Record<string, number>;
};

export interface ParsedImportData {
  years: number[];
  byYear: Record<number, YearRecord>;
}

function normalizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseValue(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/[^\d.,\-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ─── Parse uploaded buffer (CSV or XLSX) ─────────────────────────────────────
export function parseImportFile(buffer: Buffer): ParsedImportData {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (rows.length < 2) throw new Error('El archivo está vacío o tiene formato incorrecto');

  // Row 0: "CONCEPTO", year1, year2, ...
  const headerRow = rows[0] as unknown[];
  const yearCols: { colIdx: number; year: number }[] = [];

  for (let c = 1; c < headerRow.length; c++) {
    const y = parseInt(String(headerRow[c]));
    if (!isNaN(y) && y >= 1900 && y <= 2200) yearCols.push({ colIdx: c, year: y });
  }

  if (yearCols.length === 0)
    throw new Error('No se encontraron años válidos en la primera fila. Usa años como 2020, 2021…');

  const years = yearCols.map(yc => yc.year);
  const byYear: ParsedImportData['byYear'] = {};
  for (const y of years) byYear[y] = { balance: {}, income: {}, cashflow: {}, additional: {} };

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    if (!row || !row[0]) continue;
    const rawLabel = String(row[0]);
    if (rawLabel.startsWith('#') || rawLabel.startsWith('=')) continue;

    const norm = normalizeLabel(rawLabel);
    const mapping = FIELD_MAP[norm];
    if (!mapping) continue;

    for (const { colIdx, year } of yearCols) {
      byYear[year][mapping.table][mapping.field] = parseValue(row[colIdx]);
    }
  }

  return { years, byYear };
}

// ─── Generate downloadable CSV template ──────────────────────────────────────
export function generateTemplateBuffer(): Buffer {
  const now = new Date().getFullYear();
  const years = [now - 4, now - 3, now - 2, now - 1, now];

  const lines: string[] = [
    `# PLANTILLA DE IMPORTACION PROMETHEIA`,
    `# Instrucciones:`,
    `#   1. Reemplaza los años de la primera fila con tus propios ejercicios fiscales`,
    `#   2. Ingresa los valores SIN puntos de miles ni símbolo de moneda (solo números)`,
    `#   3. Las celdas vacías se tratarán como 0`,
    `#   4. No modifiques los nombres de la columna CONCEPTO`,
    `#   5. Guarda como CSV (separado por comas) o mantén el formato .xlsx`,
    `CONCEPTO,${years.join(',')}`,
    `=== BALANCE: ACTIVO NO CORRIENTE ===,,,,,`,
    `Inmovilizado material,0,0,0,0,0`,
    `Inmovilizado inmaterial,0,0,0,0,0`,
    `Inversiones financieras LP,0,0,0,0,0`,
    `Otro activo no corriente,0,0,0,0,0`,
    `=== BALANCE: ACTIVO CORRIENTE ===,,,,,`,
    `Existencias,0,0,0,0,0`,
    `Clientes,0,0,0,0,0`,
    `Otros deudores,0,0,0,0,0`,
    `Deudores fiscales,0,0,0,0,0`,
    `Efectivo y equivalentes,0,0,0,0,0`,
    `=== BALANCE: PATRIMONIO NETO ===,,,,,`,
    `Capital social,0,0,0,0,0`,
    `Reservas,0,0,0,0,0`,
    `Resultados acumulados,0,0,0,0,0`,
    `Acciones propias,0,0,0,0,0`,
    `=== BALANCE: PASIVO NO CORRIENTE ===,,,,,`,
    `Provisiones LP,0,0,0,0,0`,
    `Deudas LP,0,0,0,0,0`,
    `Otras deudas LP,0,0,0,0,0`,
    `=== BALANCE: PASIVO CORRIENTE ===,,,,,`,
    `Provisiones CP,0,0,0,0,0`,
    `Deudas CP,0,0,0,0,0`,
    `Proveedores,0,0,0,0,0`,
    `Pasivos fiscales CP,0,0,0,0,0`,
    `Otras deudas CP,0,0,0,0,0`,
    `=== CUENTA DE RESULTADOS ===,,,,,`,
    `Ingresos por ventas,0,0,0,0,0`,
    `Otros ingresos de explotacion,0,0,0,0,0`,
    `Coste de ventas,0,0,0,0,0`,
    `Coste personal ventas,0,0,0,0,0`,
    `Gastos administracion,0,0,0,0,0`,
    `Gastos personal admin,0,0,0,0,0`,
    `Amortizaciones,0,0,0,0,0`,
    `Ingresos excepcionales,0,0,0,0,0`,
    `Gastos excepcionales,0,0,0,0,0`,
    `Ingresos financieros,0,0,0,0,0`,
    `Gastos financieros,0,0,0,0,0`,
    `Impuesto sociedades,0,0,0,0,0`,
    `=== FLUJOS DE EFECTIVO ===,,,,,`,
    `Flujo caja operativo,0,0,0,0,0`,
    `Ajustes EBT,0,0,0,0,0`,
    `Variacion capital circulante,0,0,0,0,0`,
    `Inversiones pagos,0,0,0,0,0`,
    `Desinversiones cobros,0,0,0,0,0`,
    `Financiacion obtenida,0,0,0,0,0`,
    `Financiacion repagada,0,0,0,0,0`,
    `Dividendos pagados,0,0,0,0,0`,
    `=== DATOS ADICIONALES ===,,,,,`,
    `Empleados promedio,0,0,0,0,0`,
    `Numero de acciones,0,0,0,0,0`,
    `Precio por accion,0,0,0,0,0`,
    `Dividendo por accion,0,0,0,0,0`,
  ];

  // Bytes EF BB BF = UTF-8 BOM; tells Excel to open as UTF-8 instead of Windows-1252
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  return Buffer.concat([bom, Buffer.from(lines.join('\n'), 'utf-8')]);
}
