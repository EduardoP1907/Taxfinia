/**
 * MonthlyDataEntryPage (ruta: /datos-trimestrales)
 *
 * Ingreso de datos financieros mes a mes (enero–diciembre).
 * Cada mes tiene exactamente los mismos campos que el formulario anual.
 * Los datos se guardan como FiscalYear con month=1..12.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Save, CalendarDays, Building2, Wand2 } from 'lucide-react';
import { companyService } from '../../services/company.service';
import { financialService } from '../../services/financial.service';
import { monthlyForecastService } from '../../services/monthly-forecast.service';
import { useCompanyStore } from '../../store/companyStore';
import { CompanySelector } from '../../components/companies/CompanySelector';
import type { Company } from '../../types/company';
import type {
  CreateBalanceSheetData,
  CreateIncomeStatementData,
  CreateAdditionalDataData,
} from '../../types/financial';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const TABS = [
  { id: 'balance',    name: 'Balance de Situación' },
  { id: 'income',     name: 'Pérdidas y Ganancias' },
  { id: 'additional', name: 'Datos Adicionales' },
] as const;
type TabId = typeof TABS[number]['id'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthRecord {
  fiscalYearId: string | null;
  balance:    CreateBalanceSheetData;
  income:     CreateIncomeStatementData;
  additional: CreateAdditionalDataData;
}

const emptyRecord = (): MonthRecord => ({
  fiscalYearId: null,
  balance:      {},
  income:       {},
  additional:   {},
});

// ─── Number helpers ───────────────────────────────────────────────────────────

const fmt = (v: number | string | undefined): string => {
  if (v === undefined || v === null || v === '') return '';
  const n = typeof v === 'string' ? parseFloat(v.replace(/\./g, '')) : v;
  if (isNaN(n) || n === 0) return '';
  return n.toLocaleString('es-ES', { maximumFractionDigits: 0 });
};

const evaluateExpression = (raw: string): number => {
  if (!raw || raw.trim() === '') return 0;
  const s = raw.trim().replace(/\s/g, '');
  if (!/\d[+\-]/.test(s)) {
    const cleaned = s.replace(/\./g, '');
    const n = parseInt(cleaned);
    return isNaN(n) ? 0 : n;
  }
  const tokens: string[] = [];
  let current = '';
  for (let i = 0; i < s.length; i++) {
    if ((s[i] === '+' || s[i] === '-') && current.length > 0 && /\d$/.test(current)) {
      tokens.push(current);
      current = s[i];
    } else {
      current += s[i];
    }
  }
  if (current) tokens.push(current);
  let sum = 0;
  for (const token of tokens) {
    let sign = 1;
    let numStr = token;
    if (token.startsWith('-')) { sign = -1; numStr = token.slice(1); }
    else if (token.startsWith('+')) { numStr = token.slice(1); }
    const cleaned = numStr.replace(/\./g, '');
    sum += sign * (parseInt(cleaned) || 0);
  }
  return Math.round(sum);
};

// ─── ExpressionInput ─────────────────────────────────────────────────────────

const ExpressionInput: React.FC<{
  value: number | string | undefined;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const [raw, setRaw] = React.useState<string | null>(null);
  const isExpr = raw !== null && /\d[+\-]/.test(raw);
  const display = raw !== null ? raw : fmt(value);
  const computed = isExpr ? evaluateExpression(raw!) : null;

  return (
    <div className="relative">
      <input
        type="text"
        value={display}
        onFocus={() => {
          const n = value !== undefined && value !== null && value !== '' ? Number(value) : null;
          setRaw(n !== null && !isNaN(n) ? String(n) : '');
        }}
        onChange={(e) => {
          const val = e.target.value;
          setRaw(val);
          if (!/\d[+\-]/.test(val)) onChange(val);
        }}
        onBlur={(e) => {
          const val = e.target.value;
          onChange(val === '' ? '' : String(evaluateExpression(val)));
          setRaw(null);
        }}
        title={computed !== null ? `= ${computed.toLocaleString('es-ES')}` : undefined}
        className={`w-full px-1.5 py-1 border rounded text-xs text-right focus:ring-1 focus:outline-none transition-colors ${
          isExpr
            ? 'border-blue-400 focus:ring-blue-400 bg-blue-50 text-blue-700'
            : 'border-slate-200 focus:ring-amber-400 focus:border-amber-400'
        }`}
        placeholder="0"
      />
      {isExpr && computed !== null && (
        <span className="absolute right-0 -bottom-3.5 text-[9px] text-blue-500 leading-none pointer-events-none whitespace-nowrap">
          = {computed.toLocaleString('es-ES')}
        </span>
      )}
    </div>
  );
};

// ─── YearSelector ─────────────────────────────────────────────────────────────

const YearSelector: React.FC<{
  companyName: string;
  onConfirm: (year: number) => void;
  onBack: () => void;
}> = ({ companyName, onConfirm, onBack }) => {
  const current = new Date().getFullYear();
  const [year, setYear] = useState(current);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <p className="font-data text-[10px] text-amber-500/60 tracking-[0.2em] uppercase">/ Datos Mensuales</p>
            <h2 className="text-lg font-bold text-white leading-tight">{companyName}</h2>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] mb-2">Año fiscal</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
              >
                {[current + 1, current, current - 1, current - 2].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              Podrás ingresar datos para cada mes de enero a diciembre del año seleccionado.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={onBack}
                className="flex-1 py-2.5 border border-slate-700 hover:border-slate-600 text-slate-400 text-sm rounded-lg transition-all"
              >
                Volver
              </button>
              <Button onClick={() => onConfirm(year)} className="flex-1">Continuar</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Balance field config (same as annual) ────────────────────────────────────

const BALANCE_ROWS = [
  { type: 'section', label: 'ACTIVO',                   bg: 'bg-slate-200' },
  { type: 'section', label: 'A) ACTIVO FIJO',           bg: 'bg-blue-100' },
  { type: 'field',   label: 'Activo Fijo (neto)',        field: 'tangibleAssets',          indent: 1 },
  { type: 'field',   label: 'Otros Activos',             field: 'intangibleAssets',         indent: 1 },
  { type: 'field',   label: 'Inversiones financieras LP',field: 'financialInvestmentsLp',   indent: 1 },
  { type: 'section', label: 'B) ACTIVO CIRCULANTE',     bg: 'bg-green-100' },
  { type: 'field',   label: 'Existencias',              field: 'inventory',                indent: 1 },
  { type: 'field',   label: 'Clientes - Realizable CP', field: 'accountsReceivable',       indent: 2 },
  { type: 'field',   label: 'Otros - Realizable CP',    field: 'otherReceivables',         indent: 2 },
  { type: 'field',   label: 'Impuestos - Realizable CP',field: 'taxReceivables',           indent: 2 },
  { type: 'field',   label: 'Disponible',               field: 'cashEquivalents',          indent: 1 },
  { type: 'total',   label: 'TOTAL ACTIVO (A+B)',       bg: 'bg-blue-200', key: 'totalActivo' },
  { type: 'section', label: 'PATRIMONIO NETO Y PASIVO', bg: 'bg-slate-200' },
  { type: 'field',   label: 'A) PATRIMONIO NETO',       field: 'shareCapital',             indent: 0, bold: true },
  { type: 'field',   label: 'Reservas',                 field: 'reserves',                 indent: 1 },
  { type: 'field',   label: 'Resultado del ejercicio',  field: 'retainedEarnings',         indent: 1 },
  { type: 'field',   label: 'Acciones propias (–)',     field: 'treasuryStock',            indent: 1 },
  { type: 'section', label: 'B) PASIVO NO CIRCULANTE',  bg: 'bg-orange-100' },
  { type: 'field',   label: 'Provisiones LP',           field: 'provisionsLp',             indent: 1 },
  { type: 'field',   label: 'Deudas Largo Plazo',       field: 'bankDebtLp',               indent: 1 },
  { type: 'field',   label: 'Otras Largo Plazo',        field: 'otherLiabilitiesLp',       indent: 1 },
  { type: 'section', label: 'C) PASIVO CIRCULANTE',     bg: 'bg-red-100' },
  { type: 'field',   label: 'Provisiones CP',           field: 'provisionsSp',             indent: 1 },
  { type: 'field',   label: 'Deudas Corto Plazo',       field: 'bankDebtSp',               indent: 1 },
  { type: 'field',   label: 'Proveedores CP',           field: 'accountsPayable',          indent: 1 },
  { type: 'field',   label: 'Impuestos Pasivo CP',      field: 'taxLiabilities',           indent: 1 },
  { type: 'field',   label: 'Otras a Pagar CP',         field: 'otherLiabilitiesSp',       indent: 1 },
  { type: 'total',   label: 'TOTAL PASIVO + PN (A+B+C)',bg: 'bg-blue-200', key: 'totalPasivo' },
  { type: 'cuadratura' },
] as const;

type BalanceRowField = Extract<typeof BALANCE_ROWS[number], { type: 'field' }>;

const calcTotalActivo = (b: CreateBalanceSheetData): number =>
  Number(b.tangibleAssets||0) + Number(b.intangibleAssets||0) + Number(b.financialInvestmentsLp||0) +
  Number(b.otherNoncurrentAssets||0) + Number(b.inventory||0) + Number(b.accountsReceivable||0) +
  Number(b.otherReceivables||0) + Number(b.taxReceivables||0) + Number(b.cashEquivalents||0);

const calcTotalPasivo = (b: CreateBalanceSheetData): number =>
  Number(b.shareCapital||0) + Number(b.reserves||0) + Number(b.retainedEarnings||0) - Number(b.treasuryStock||0) +
  Number(b.provisionsLp||0) + Number(b.bankDebtLp||0) + Number(b.otherLiabilitiesLp||0) +
  Number(b.provisionsSp||0) + Number(b.bankDebtSp||0) + Number(b.accountsPayable||0) +
  Number(b.taxLiabilities||0) + Number(b.otherLiabilitiesSp||0);

// ─── Income field config (same as annual) ────────────────────────────────────

const INCOME_ROWS = [
  { type: 'section', label: 'CUENTA DE PÉRDIDAS Y GANANCIAS', bg: 'bg-slate-200' },
  { type: 'subsection', label: 'Ingresos por Ventas',          bg: 'bg-green-50' },
  { type: 'field',   label: 'Ingresos por ventas (+)',         field: 'revenue',             indent: 1 },
  { type: 'subsection', label: 'Coste de las ventas',          bg: 'bg-red-50' },
  { type: 'field',   label: 'Coste de las ventas (–)',         field: 'costOfSales',         indent: 1 },
  { type: 'field',   label: 'Remuneraciones ventas (–)',       field: 'staffCostsSales',     indent: 1 },
  { type: 'subsection', label: 'Gastos de administración',     bg: 'bg-orange-50' },
  { type: 'field',   label: 'Gastos administración (–)',       field: 'adminExpenses',       indent: 1 },
  { type: 'field',   label: 'Remuneraciones admin (–)',        field: 'staffCostsAdmin',     indent: 1 },
  { type: 'field',   label: 'Depreciaciones (–)',              field: 'depreciation',        indent: 1 },
  { type: 'calc',    label: 'Resultado de explotación',        bg: 'bg-green-200', key: 'ebit' },
  { type: 'field',   label: 'Ingresos excepcionales (+)',      field: 'exceptionalIncome',   indent: 1 },
  { type: 'field',   label: 'Gastos excepcionales (–)',        field: 'exceptionalExpenses', indent: 1 },
  { type: 'calc',    label: 'Resultado excepcional',           bg: 'bg-yellow-200', key: 'excep' },
  { type: 'field',   label: 'Ingresos financieros (+)',        field: 'financialIncome',     indent: 1 },
  { type: 'field',   label: 'Gastos financieros (–)',          field: 'financialExpenses',   indent: 1 },
  { type: 'calc',    label: 'Resultado Financiero',            bg: 'bg-blue-200',  key: 'fin' },
  { type: 'calc',    label: 'Resultado antes de impuestos',    bg: 'bg-amber-100', key: 'ebt' },
  { type: 'field',   label: 'Impuestos s/beneficios (–)',      field: 'incomeTax',           indent: 1 },
  { type: 'calc',    label: 'Resultado del Ejercicio',         bg: 'bg-green-300', key: 'net' },
] as const;

type IncomeRowField = Extract<typeof INCOME_ROWS[number], { type: 'field' }>;

const calcIncome = (inc: CreateIncomeStatementData) => {
  const rev  = Number(inc.revenue||0);
  const cv   = Number(inc.costOfSales||0) + Number(inc.staffCostsSales||0);
  const ga   = Number(inc.adminExpenses||0) + Number(inc.staffCostsAdmin||0) + Number(inc.depreciation||0);
  const ebit = rev - cv - ga;
  const excep = Number(inc.exceptionalIncome||0) - Number(inc.exceptionalExpenses||0);
  const fin   = Number(inc.financialIncome||0) - Number(inc.financialExpenses||0);
  const ebt   = ebit + excep + fin;
  const net   = ebt - Number(inc.incomeTax||0);
  return { ebit, excep, fin, ebt, net };
};

// ─── Additional field config ──────────────────────────────────────────────────

const ADDITIONAL_ROWS = [
  { type: 'section', label: 'ACCIONES Y MERCADO',          bg: 'bg-blue-100' },
  { type: 'field',   label: 'Número de acciones',           field: 'sharesOutstanding', indent: 1 },
  { type: 'field',   label: 'Precio por acción',            field: 'sharePrice',        indent: 1 },
  { type: 'field',   label: 'Dividendos por acción',        field: 'dividendsPerShare', indent: 1 },
  { type: 'section', label: 'PERSONAL',                     bg: 'bg-green-100' },
  { type: 'field',   label: 'Personal asalariado (media)',  field: 'averageEmployees',  indent: 1 },
  { type: 'section', label: 'INVENTARIO Y COMPRAS',         bg: 'bg-orange-100' },
  { type: 'field',   label: 'Existencias PROMEDIO',         field: 'averageInventory',  indent: 1 },
  { type: 'field',   label: 'Consumo / coste material',     field: 'materialCost',      indent: 1 },
  { type: 'field',   label: 'Compras',                      field: 'purchases',         indent: 1 },
  { type: 'section', label: 'FINANCIACIÓN',                 bg: 'bg-pink-100' },
  { type: 'field',   label: 'Amortizaciones préstamos',     field: 'loanAmortization',  indent: 1 },
] as const;

type AdditionalRowField = Extract<typeof ADDITIONAL_ROWS[number], { type: 'field' }>;

// ─── Table header ─────────────────────────────────────────────────────────────

const thBase = 'px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide bg-slate-50 border-b border-r border-slate-200 min-w-[88px]';
const tdLabel = (indent: number, bold?: boolean, bg?: string) =>
  `px-2 py-1.5 text-xs border-b border-r border-slate-100 sticky left-0 z-10 ${bg || 'bg-white'} ${bold ? 'font-semibold' : ''} ${indent === 1 ? 'pl-6' : indent === 2 ? 'pl-10' : ''}`;
const tdCell = 'px-1 py-1 border-b border-r border-slate-100 bg-white';
const tdCalc = (bg: string) => `px-2 py-1.5 text-xs text-right font-semibold border-b border-r border-slate-100 ${bg}`;

// ─── Main component ───────────────────────────────────────────────────────────

export const QuarterlyDataEntryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const setStoreCompany = useCompanyStore((s) => s.setSelectedCompany);

  const companyId = searchParams.get('companyId');
  const yearParam = searchParams.get('year');

  const [company,          setCompany]          = useState<Company | null>(null);
  const [companies,        setCompanies]        = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loading,          setLoading]          = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [autofilling,      setAutofilling]      = useState(false);
  const [savedAt,          setSavedAt]          = useState<Date | null>(null);
  const [activeTab,        setActiveTab]        = useState<TabId>('balance');

  // 12 month records (index 0 = January, 11 = December)
  const [records, setRecords] = useState<MonthRecord[]>(Array.from({length:12}, emptyRecord));

  // ── Load companies ──────────────────────────────────────────────────────────
  useEffect(() => {
    companyService.getCompanies()
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoadingCompanies(false));
  }, []);

  // ── Load company when companyId changes ────────────────────────────────────
  useEffect(() => {
    if (!companyId) return;
    companyService.getCompany(companyId).then((c) => {
      setCompany(c);
      setStoreCompany(c);
    }).catch(console.error);
  }, [companyId]);

  // ── Load existing monthly data ─────────────────────────────────────────────
  const loadMonthlyData = useCallback(async () => {
    if (!companyId || !yearParam) return;
    const year = parseInt(yearParam);
    setLoading(true);
    try {
      const monthlyFYs = await financialService.getMonthlyFiscalYears(companyId, year);

      const newRecords = Array.from({length:12}, emptyRecord);

      await Promise.all(monthlyFYs.map(async (fy) => {
        const mIdx = (fy.month ?? 0) - 1;
        if (mIdx < 0 || mIdx > 11) return;

        const [bal, inc, add] = await Promise.all([
          financialService.getBalanceSheet(fy.id).catch(() => null),
          financialService.getIncomeStatement(fy.id).catch(() => null),
          financialService.getAdditionalData(fy.id).catch(() => null),
        ]);

        newRecords[mIdx] = {
          fiscalYearId: fy.id,
          balance:    bal    ? { ...bal }    : {},
          income:     inc    ? { ...inc }    : {},
          additional: add    ? { ...add }    : {},
        };
      }));

      setRecords(newRecords);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [companyId, yearParam]);

  useEffect(() => { loadMonthlyData(); }, [loadMonthlyData]);

  // ── Update a field ──────────────────────────────────────────────────────────
  const updateField = (
    mIdx: number,
    section: 'balance' | 'income' | 'additional',
    field: string,
    val: string,
  ) => {
    setRecords((prev) => {
      const next = [...prev];
      const rec  = { ...next[mIdx], [section]: { ...next[mIdx][section] } };
      (rec[section] as any)[field] = val === '' ? undefined : evaluateExpression(val) || undefined;
      next[mIdx] = rec;
      return next;
    });
  };

  // ── Save all ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!companyId || !yearParam) return;
    const year = parseInt(yearParam);
    setSaving(true);
    try {
      const updated = [...records];
      await Promise.all(
        updated.map(async (rec, mIdx) => {
          // Create FiscalYear record on demand for months that don't have one yet
          if (!rec.fiscalYearId) {
            const fy = await financialService.createMonthlyFiscalYear(companyId, year, mIdx + 1);
            updated[mIdx] = { ...rec, fiscalYearId: fy.id };
            rec = updated[mIdx];
          }
          await Promise.all([
            financialService.createOrUpdateBalanceSheet(rec.fiscalYearId!, rec.balance),
            financialService.createOrUpdateIncomeStatement(rec.fiscalYearId!, rec.income),
            financialService.createOrUpdateAdditionalData(rec.fiscalYearId!, rec.additional),
          ]);
        })
      );
      setRecords(updated);
      setSavedAt(new Date());
    } catch (err) {
      console.error(err);
      alert('Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  // ── Autocompletar desde Forecast Mensual (hoja FCASTBCE2026) ──────────────────
  // Trae los 12 meses calculados (cerrados con dato real + proyectados) del
  // Forecast Mensual y los vuelca en el grid. Se apoya en /monthly-forecast/calculate,
  // que ya replica la fórmula de la hoja FCASTBCE2026 (drivers de ventas/costes +
  // patrimonio neto acumulando el resultado + cuadratura vía Activo Fijo).
  const handleAutofillFromForecast = async () => {
    if (!companyId || !yearParam) return;
    const year = parseInt(yearParam);

    const hasExistingData = records.some(
      (r) => Object.keys(r.balance).length > 0 || Object.keys(r.income).length > 0
    );
    if (hasExistingData && !window.confirm(
      'Esto sobrescribirá el Balance y la Cuenta de P&G de los 12 meses con los valores ' +
      'calculados en el Forecast Mensual. Los cambios no se guardan hasta pulsar «Guardar todo». ¿Continuar?'
    )) {
      return;
    }

    setAutofilling(true);
    try {
      const calc = await monthlyForecastService.calculate(companyId, year);

      setRecords((prev) =>
        prev.map((rec, mIdx) => {
          const p = calc.pnl[mIdx];
          const b = calc.balance[mIdx];

          const income: CreateIncomeStatementData = {
            ...rec.income,
            revenue: p.revenue,
            costOfSales: p.costOfSales,
            staffCostsSales: 0,
            adminExpenses: p.adminExpenses,
            staffCostsAdmin: 0,
            depreciation: 0,
            exceptionalIncome: p.exceptionalIncome,
            exceptionalExpenses: p.exceptionalExpenses,
            financialIncome: p.financialIncome,
            financialExpenses: p.financialExpenses,
            incomeTax: p.incomeTax,
          };

          const balance: CreateBalanceSheetData = {
            ...rec.balance,
            tangibleAssets: b.fixedAssets,
            intangibleAssets: 0,
            financialInvestmentsLp: b.financialInvestmentsLp,
            otherNoncurrentAssets: b.otherNoncurrentAssets,
            inventory: b.inventory,
            accountsReceivable: b.accountsReceivable,
            otherReceivables: 0,
            taxReceivables: b.taxReceivables,
            cashEquivalents: b.cashEquivalents,
            shareCapital: b.equity,
            reserves: 0,
            retainedEarnings: 0,
            treasuryStock: 0,
            provisionsLp: b.provisionsLp,
            bankDebtLp: b.bankDebtLp,
            otherLiabilitiesLp: b.otherLiabilitiesLp,
            provisionsSp: b.provisionsSp,
            bankDebtSp: b.bankDebtSp,
            accountsPayable: b.accountsPayable,
            taxLiabilities: b.taxLiabilities,
            otherLiabilitiesSp: b.otherLiabilitiesSp,
          };

          return { ...rec, income, balance };
        })
      );
    } catch (err: any) {
      alert(
        err?.response?.data?.error ||
        err.message ||
        'No se pudo calcular el forecast mensual. Configura primero la proyección en "Forecast Mensual".'
      );
    } finally {
      setAutofilling(false);
    }
  };

  // ── Steps ────────────────────────────────────────────────────────────────────
  if (!companyId) {
    return (
      <CompanySelector
        companies={companies}
        loading={loadingCompanies}
        onSelect={(c) => setSearchParams({ companyId: c.id })}
        title="Datos Mensuales"
        description="Selecciona una empresa para ingresar datos mes a mes"
        icon={<Building2 className="w-7 h-7 text-slate-900" />}
      />
    );
  }

  if (!yearParam) {
    if (!company) return null;
    return (
      <YearSelector
        companyName={company.name}
        onConfirm={(y) => setSearchParams({ companyId, year: String(y) })}
        onBack={() => setSearchParams({})}
      />
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
        </div>
      </DashboardLayout>
    );
  }

  const year = parseInt(yearParam);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-full mx-auto px-4 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-data text-[10px] text-slate-400 tracking-[0.2em] uppercase">/ Datos Mensuales</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{company?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                <CalendarDays className="w-3.5 h-3.5" />
                Enero – Diciembre {year}
              </span>
              <button
                onClick={() => setSearchParams({ companyId })}
                className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
              >
                Cambiar año
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-xs text-green-600 font-medium">
                Guardado {savedAt.toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}
              </span>
            )}
            <Button
              variant="secondary"
              onClick={handleAutofillFromForecast}
              disabled={autofilling || saving}
            >
              <Wand2 className="w-4 h-4 mr-1.5" />
              {autofilling ? 'Calculando…' : 'Autocompletar desde Forecast'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Guardando…' : 'Guardar todo'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px space-x-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* ── BALANCE TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'balance' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-r border-slate-200 sticky left-0 z-20 min-w-[230px]">
                    Balance de Situación
                  </th>
                  {MONTHS_SHORT.map((m) => (
                    <th key={m} className={thBase}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BALANCE_ROWS.map((row, ri) => {
                  if (row.type === 'section') {
                    return (
                      <tr key={ri}>
                        <td colSpan={13} className={`px-3 py-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-r border-slate-200 sticky left-0 z-10 ${row.bg}`}>
                          {row.label}
                        </td>
                      </tr>
                    );
                  }
                  if (row.type === 'field') {
                    const f = row as BalanceRowField;
                    return (
                      <tr key={ri} className="hover:bg-slate-50/50">
                        <td className={tdLabel(f.indent, f.bold, 'bg-white')}>{f.label}</td>
                        {records.map((rec, mi) => (
                          <td key={mi} className={tdCell}>
                            <ExpressionInput
                              value={rec.balance[f.field as keyof CreateBalanceSheetData]}
                              onChange={(v) => updateField(mi, 'balance', f.field, v)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  }
                  if (row.type === 'total') {
                    const isActivo = (row as any).key === 'totalActivo';
                    return (
                      <tr key={ri} className={(row as any).bg}>
                        <td className={`px-3 py-1.5 text-xs font-bold text-slate-700 uppercase border-b border-r border-slate-200 sticky left-0 z-10 ${(row as any).bg}`}>
                          {row.label}
                        </td>
                        {records.map((rec, mi) => {
                          const val = isActivo ? calcTotalActivo(rec.balance) : calcTotalPasivo(rec.balance);
                          return (
                            <td key={mi} className={`px-2 py-1.5 text-xs text-right font-semibold border-b border-r border-slate-200 ${(row as any).bg}`}>
                              {val !== 0 ? fmt(val) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }
                  if (row.type === 'cuadratura') {
                    const allOk = records.every((r) => Math.abs(calcTotalActivo(r.balance) - calcTotalPasivo(r.balance)) < 1);
                    return (
                      <tr key={ri} className={allOk ? 'bg-green-100' : 'bg-red-100'}>
                        <td className={`px-3 py-1.5 text-xs font-bold border-b border-r border-slate-200 sticky left-0 z-10 ${allOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {allOk ? '✓ CUADRATURA' : '⚠ CUADRATURA'}
                        </td>
                        {records.map((rec, mi) => {
                          const diff = calcTotalActivo(rec.balance) - calcTotalPasivo(rec.balance);
                          const ok   = Math.abs(diff) < 1;
                          return (
                            <td key={mi} className={`px-1 py-1.5 text-center text-[10px] font-semibold border-b border-r border-slate-200 ${ok ? 'text-green-700' : 'text-red-700'}`}>
                              {ok ? '✓' : `Δ${fmt(Math.abs(diff))}`}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }
                  return null;
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── INCOME TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'income' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-r border-slate-200 sticky left-0 z-20 min-w-[230px]">
                    Pérdidas y Ganancias
                  </th>
                  {MONTHS_SHORT.map((m) => (
                    <th key={m} className={thBase}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INCOME_ROWS.map((row, ri) => {
                  if (row.type === 'section' || row.type === 'subsection') {
                    return (
                      <tr key={ri}>
                        <td colSpan={13} className={`px-3 py-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-r border-slate-200 sticky left-0 z-10 ${(row as any).bg || ''}`}>
                          {row.label}
                        </td>
                      </tr>
                    );
                  }
                  if (row.type === 'field') {
                    const f = row as IncomeRowField;
                    return (
                      <tr key={ri} className="hover:bg-slate-50/50">
                        <td className={tdLabel(f.indent, false, 'bg-white')}>{f.label}</td>
                        {records.map((rec, mi) => (
                          <td key={mi} className={tdCell}>
                            <ExpressionInput
                              value={rec.income[f.field as keyof CreateIncomeStatementData]}
                              onChange={(v) => updateField(mi, 'income', f.field, v)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  }
                  if (row.type === 'calc') {
                    const r = row as any;
                    return (
                      <tr key={ri}>
                        <td className={`px-3 py-1.5 text-xs font-bold text-slate-700 border-b border-r border-slate-200 sticky left-0 z-10 ${r.bg}`}>
                          {r.label}
                        </td>
                        {records.map((rec, mi) => {
                          const c = calcIncome(rec.income);
                          const val = c[r.key as keyof typeof c];
                          return (
                            <td key={mi} className={`px-2 py-1.5 text-xs text-right font-semibold border-b border-r border-slate-200 ${r.bg}`}>
                              <span className={val < 0 ? 'text-red-600' : ''}>
                                {val !== 0 ? fmt(val) : '—'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }
                  return null;
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── ADDITIONAL TAB ────────────────────────────────────────────────── */}
        {activeTab === 'additional' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-r border-slate-200 sticky left-0 z-20 min-w-[230px]">
                    Datos Adicionales
                  </th>
                  {MONTHS_SHORT.map((m) => (
                    <th key={m} className={thBase}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ADDITIONAL_ROWS.map((row, ri) => {
                  if (row.type === 'section') {
                    return (
                      <tr key={ri}>
                        <td colSpan={13} className={`px-3 py-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-r border-slate-200 sticky left-0 z-10 ${(row as any).bg}`}>
                          {row.label}
                        </td>
                      </tr>
                    );
                  }
                  if (row.type === 'field') {
                    const f = row as AdditionalRowField;
                    return (
                      <tr key={ri} className="hover:bg-slate-50/50">
                        <td className={tdLabel(f.indent, false, 'bg-white')}>{f.label}</td>
                        {records.map((rec, mi) => (
                          <td key={mi} className={tdCell}>
                            <ExpressionInput
                              value={rec.additional[f.field as keyof CreateAdditionalDataData]}
                              onChange={(v) => updateField(mi, 'additional', f.field, v)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  }
                  return null;
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};
