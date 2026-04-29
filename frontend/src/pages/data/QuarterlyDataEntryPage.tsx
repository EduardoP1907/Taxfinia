/**
 * QuarterlyDataEntryPage
 * Ingreso de datos financieros por trimestre (T1, T2, T3).
 *
 * Flujo:
 * 1. Seleccionar empresa (CompanySelector)
 * 2. Seleccionar trimestre y año (QuarterSelector modal)
 * 3. Ingresar datos con columnas = meses del trimestre elegido
 *    - P&G: se suma por mes → total acumulado
 *    - Balance: se usa el valor del último mes del trimestre
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { companyService } from '../../services/company.service';
import { financialService } from '../../services/financial.service';
import { useCompanyStore } from '../../store/companyStore';
import { CompanySelector } from '../../components/companies/CompanySelector';
import type { Company } from '../../types/company';
import { Save, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const QUARTER_MONTHS: Record<number, { label: string; months: string[]; short: string }> = {
  1: { label: 'T1 — Enero a Marzo',     months: ['Enero',    'Febrero',   'Marzo'],     short: 'Ene-Mar' },
  2: { label: 'T2 — Abril a Junio',     months: ['Abril',    'Mayo',      'Junio'],     short: 'Abr-Jun' },
  3: { label: 'T3 — Julio a Septiembre', months: ['Julio',   'Agosto',    'Septiembre'], short: 'Jul-Sep' },
};

const formatNum = (v: number | string | undefined): string => {
  if (v === undefined || v === null || v === '') return '';
  const n = typeof v === 'string' ? parseFloat(v.replace(/\./g, '')) : v;
  if (isNaN(n)) return '';
  return n.toLocaleString('es-ES', { maximumFractionDigits: 0 });
};

const parseNum = (v: string): number => {
  if (!v) return 0;
  const n = parseInt(v.replace(/\./g, ''));
  return isNaN(n) ? 0 : n;
};

// ─── Types ────────────────────────────────────────────────────────────────────
type MonthlyIncome = { revenue: number; costOfSales: number; staffCostsSales: number; adminExpenses: number; staffCostsAdmin: number; depreciation: number; exceptionalIncome: number; exceptionalExpenses: number; financialIncome: number; financialExpenses: number; incomeTax: number };
type BalanceSnap   = { tangibleAssets: number; intangibleAssets: number; financialInvestmentsLp: number; otherNoncurrentAssets: number; inventory: number; accountsReceivable: number; otherReceivables: number; taxReceivables: number; cashEquivalents: number; shareCapital: number; reserves: number; retainedEarnings: number; treasuryStock: number; provisionsLp: number; bankDebtLp: number; otherLiabilitiesLp: number; provisionsSp: number; bankDebtSp: number; accountsPayable: number; taxLiabilities: number; otherLiabilitiesSp: number };

const emptyIncome  = (): MonthlyIncome  => ({ revenue: 0, costOfSales: 0, staffCostsSales: 0, adminExpenses: 0, staffCostsAdmin: 0, depreciation: 0, exceptionalIncome: 0, exceptionalExpenses: 0, financialIncome: 0, financialExpenses: 0, incomeTax: 0 });
const emptyBalance = (): BalanceSnap   => ({ tangibleAssets: 0, intangibleAssets: 0, financialInvestmentsLp: 0, otherNoncurrentAssets: 0, inventory: 0, accountsReceivable: 0, otherReceivables: 0, taxReceivables: 0, cashEquivalents: 0, shareCapital: 0, reserves: 0, retainedEarnings: 0, treasuryStock: 0, provisionsLp: 0, bankDebtLp: 0, otherLiabilitiesLp: 0, provisionsSp: 0, bankDebtSp: 0, accountsPayable: 0, taxLiabilities: 0, otherLiabilitiesSp: 0 });

// ─── Income field config ──────────────────────────────────────────────────────
const INCOME_FIELDS: { label: string; key: keyof MonthlyIncome; isCost?: boolean }[] = [
  { label: 'Ingresos por Ventas',       key: 'revenue' },
  { label: 'Coste de las ventas',       key: 'costOfSales',        isCost: true },
  { label: 'Costes personal ventas',    key: 'staffCostsSales',    isCost: true },
  { label: 'Gastos de administración',  key: 'adminExpenses',      isCost: true },
  { label: 'Costes personal admin',     key: 'staffCostsAdmin',    isCost: true },
  { label: 'Amortizaciones',            key: 'depreciation',       isCost: true },
  { label: 'Ingresos excepcionales',    key: 'exceptionalIncome' },
  { label: 'Gastos excepcionales',      key: 'exceptionalExpenses', isCost: true },
  { label: 'Ingresos financieros',      key: 'financialIncome' },
  { label: 'Gastos financieros',        key: 'financialExpenses',  isCost: true },
  { label: 'Impuesto sobre Sociedades', key: 'incomeTax',          isCost: true },
];

// ─── Balance field config ─────────────────────────────────────────────────────
const BALANCE_SECTIONS = [
  {
    title: 'ACTIVO NO CORRIENTE',
    fields: [
      { label: 'Inmovilizado material',        key: 'tangibleAssets' },
      { label: 'Inmovilizado inmaterial',       key: 'intangibleAssets' },
      { label: 'Inversiones financieras LP',    key: 'financialInvestmentsLp' },
      { label: 'Otro activo LP',                key: 'otherNoncurrentAssets' },
    ],
  },
  {
    title: 'ACTIVO CORRIENTE',
    fields: [
      { label: 'Existencias',                   key: 'inventory' },
      { label: 'Clientes',                      key: 'accountsReceivable' },
      { label: 'Otros deudores',                key: 'otherReceivables' },
      { label: 'Activos fiscales CP',            key: 'taxReceivables' },
      { label: 'Efectivo y equivalentes',        key: 'cashEquivalents' },
    ],
  },
  {
    title: 'PATRIMONIO NETO',
    fields: [
      { label: 'Capital social',                key: 'shareCapital' },
      { label: 'Reservas',                      key: 'reserves' },
      { label: 'Resultado del ejercicio',        key: 'retainedEarnings' },
      { label: 'Acciones propias (–)',           key: 'treasuryStock' },
    ],
  },
  {
    title: 'PASIVO NO CORRIENTE',
    fields: [
      { label: 'Provisiones LP',                key: 'provisionsLp' },
      { label: 'Deudas LP',                     key: 'bankDebtLp' },
      { label: 'Otros pasivos LP',              key: 'otherLiabilitiesLp' },
    ],
  },
  {
    title: 'PASIVO CORRIENTE',
    fields: [
      { label: 'Provisiones CP',                key: 'provisionsSp' },
      { label: 'Deudas CP',                     key: 'bankDebtSp' },
      { label: 'Proveedores',                   key: 'accountsPayable' },
      { label: 'Pasivos fiscales CP',           key: 'taxLiabilities' },
      { label: 'Otros pasivos CP',              key: 'otherLiabilitiesSp' },
    ],
  },
] as const;

// ─── QuarterSelector modal ────────────────────────────────────────────────────
interface QuarterSelectorProps {
  onConfirm: (year: number, quarter: number) => void;
  onBack: () => void;
  companyName: string;
}
const QuarterSelector: React.FC<QuarterSelectorProps> = ({ onConfirm, onBack, companyName }) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear]       = useState(currentYear);
  const [quarter, setQuarter] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <p className="font-data text-[10px] text-amber-500/60 tracking-[0.2em] uppercase">/ Datos Trimestrales</p>
            <h2 className="text-lg font-bold text-white leading-tight">{companyName}</h2>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          <div className="p-5 space-y-5">
            {/* Year */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] mb-2">Año fiscal</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              >
                {[currentYear + 1, currentYear, currentYear - 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Quarter */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] mb-2">Trimestre</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuarter(q)}
                    className={`py-4 rounded-lg border-2 text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                      quarter === q
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-lg font-bold mb-1">T{q}</div>
                    <div className="text-[10px] font-normal text-slate-500">{QUARTER_MONTHS[q].short}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={onBack}
                className="flex-1 py-2.5 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-sm rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
              >
                Volver
              </button>
              <Button
                onClick={() => quarter && onConfirm(year, quarter)}
                disabled={!quarter}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Editable cell ────────────────────────────────────────────────────────────
const Cell: React.FC<{
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const [raw, setRaw] = useState(value === 0 ? '' : formatNum(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setRaw(value === 0 ? '' : formatNum(value));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="numeric"
      disabled={disabled}
      value={focused ? raw : (value === 0 ? '' : formatNum(value))}
      onChange={(e) => setRaw(e.target.value)}
      onFocus={() => { setFocused(true); setRaw(value === 0 ? '' : String(value)); }}
      onBlur={() => { setFocused(false); onChange(parseNum(raw)); }}
      className="w-full text-right text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-400 rounded px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
      placeholder="0"
    />
  );
};

// ─── Page component ───────────────────────────────────────────────────────────
export const QuarterlyDataEntryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSelectedCompanyInStore = useCompanyStore((s) => s.setSelectedCompany);

  const companyId  = searchParams.get('companyId');
  const yearParam  = searchParams.get('year');
  const qParam     = searchParams.get('quarter');

  const [company, setCompany]           = useState<Company | null>(null);
  const [companies, setCompanies]           = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [activeTab, setActiveTab]       = useState<'income' | 'balance'>('income');
  const [fiscalYearId, setFiscalYearId] = useState<string | null>(null);

  // 3 months of P&G data
  const [incomeMonths, setIncomeMonths] = useState<[MonthlyIncome, MonthlyIncome, MonthlyIncome]>([emptyIncome(), emptyIncome(), emptyIncome()]);
  // Balance = snapshot at last month of quarter
  const [balance, setBalance] = useState<BalanceSnap>(emptyBalance());

  useEffect(() => {
    companyService.getCompanies()
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoadingCompanies(false));
  }, []);

  useEffect(() => {
    if (companyId) {
      companyService.getCompany(companyId).then((c) => {
        setCompany(c);
        setSelectedCompanyInStore(c);
      }).catch(console.error);
    }
  }, [companyId]);

  // Load existing data when all params present
  useEffect(() => {
    if (!companyId || !yearParam || !qParam) return;
    const year = parseInt(yearParam);
    const quarter = parseInt(qParam);
    (async () => {
      setLoading(true);
      try {
        // Get or create the fiscal year record for this quarter
        const fy = await financialService.createQuarterlyFiscalYear(companyId, year, quarter);
        setFiscalYearId(fy.id);

        const [existIncome, existBalance] = await Promise.all([
          financialService.getIncomeStatement(fy.id).catch(() => null),
          financialService.getBalanceSheet(fy.id).catch(() => null),
        ]);

        // If we have existing P&G, put it in month 1 (rest empty — monthly breakdown not stored)
        if (existIncome) {
          setIncomeMonths([
            {
              revenue: Number(existIncome.revenue ?? 0),
              costOfSales: Number(existIncome.costOfSales ?? 0),
              staffCostsSales: Number(existIncome.staffCostsSales ?? 0),
              adminExpenses: Number(existIncome.adminExpenses ?? 0),
              staffCostsAdmin: Number(existIncome.staffCostsAdmin ?? 0),
              depreciation: Number(existIncome.depreciation ?? 0),
              exceptionalIncome: Number(existIncome.exceptionalIncome ?? 0),
              exceptionalExpenses: Number(existIncome.exceptionalExpenses ?? 0),
              financialIncome: Number(existIncome.financialIncome ?? 0),
              financialExpenses: Number(existIncome.financialExpenses ?? 0),
              incomeTax: Number(existIncome.incomeTax ?? 0),
            },
            emptyIncome(),
            emptyIncome(),
          ]);
        }

        if (existBalance) {
          setBalance({
            tangibleAssets: Number(existBalance.tangibleAssets ?? 0),
            intangibleAssets: Number(existBalance.intangibleAssets ?? 0),
            financialInvestmentsLp: Number(existBalance.financialInvestmentsLp ?? 0),
            otherNoncurrentAssets: Number(existBalance.otherNoncurrentAssets ?? 0),
            inventory: Number(existBalance.inventory ?? 0),
            accountsReceivable: Number(existBalance.accountsReceivable ?? 0),
            otherReceivables: Number(existBalance.otherReceivables ?? 0),
            taxReceivables: Number(existBalance.taxReceivables ?? 0),
            cashEquivalents: Number(existBalance.cashEquivalents ?? 0),
            shareCapital: Number(existBalance.shareCapital ?? 0),
            reserves: Number(existBalance.reserves ?? 0),
            retainedEarnings: Number(existBalance.retainedEarnings ?? 0),
            treasuryStock: Number(existBalance.treasuryStock ?? 0),
            provisionsLp: Number(existBalance.provisionsLp ?? 0),
            bankDebtLp: Number(existBalance.bankDebtLp ?? 0),
            otherLiabilitiesLp: Number(existBalance.otherLiabilitiesLp ?? 0),
            provisionsSp: Number(existBalance.provisionsSp ?? 0),
            bankDebtSp: Number(existBalance.bankDebtSp ?? 0),
            accountsPayable: Number(existBalance.accountsPayable ?? 0),
            taxLiabilities: Number(existBalance.taxLiabilities ?? 0),
            otherLiabilitiesSp: Number(existBalance.otherLiabilitiesSp ?? 0),
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, yearParam, qParam]);

  const updateIncome = (monthIdx: number, field: keyof MonthlyIncome, value: number) => {
    setIncomeMonths((prev) => {
      const next: [MonthlyIncome, MonthlyIncome, MonthlyIncome] = [{ ...prev[0] }, { ...prev[1] }, { ...prev[2] }];
      next[monthIdx] = { ...next[monthIdx], [field]: value };
      return next;
    });
  };

  const sumIncome = (): Record<keyof MonthlyIncome, number> => {
    const result = { ...emptyIncome() };
    for (const m of incomeMonths) {
      for (const k of Object.keys(result) as (keyof MonthlyIncome)[]) {
        result[k] += m[k];
      }
    }
    return result;
  };

  const handleSave = async () => {
    if (!fiscalYearId) return;
    setSaving(true);
    try {
      const totalIncome = sumIncome();
      await Promise.all([
        financialService.createOrUpdateIncomeStatement(fiscalYearId, totalIncome),
        financialService.createOrUpdateBalanceSheet(fiscalYearId, balance),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 1: no company selected ──────────────────────────────────────────
  if (!companyId) {
    return (
      <CompanySelector
        companies={companies}
        loading={loadingCompanies}
        onSelect={(c) => setSearchParams({ companyId: c.id })}
        title="Datos Trimestrales"
        description="Selecciona una empresa para ingresar datos de un trimestre"
        icon={<Calendar className="w-7 h-7 text-slate-900" />}
      />
    );
  }

  // ── Step 2: no quarter selected ──────────────────────────────────────────
  if (!yearParam || !qParam) {
    if (!company) return null;
    return (
      <QuarterSelector
        companyName={company.name}
        onConfirm={(y, q) => setSearchParams({ companyId, year: String(y), quarter: String(q) })}
        onBack={() => setSearchParams({})}
      />
    );
  }

  const year    = parseInt(yearParam);
  const quarter = parseInt(qParam);
  const qInfo   = QUARTER_MONTHS[quarter];
  const months  = qInfo?.months ?? [];
  const periodLabel = `T${quarter} ${year} (${qInfo?.short ?? ''})`;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
        </div>
      </DashboardLayout>
    );
  }

  // ── Step 3: data entry form ──────────────────────────────────────────────
  const thClass = 'px-3 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200';
  const tdLabel = 'px-3 py-2 text-sm text-slate-700 font-medium border-b border-slate-100 bg-white';
  const tdCell  = 'px-1 py-1 border-b border-slate-100 bg-white';
  const tdTotal = 'px-3 py-2 text-right text-sm font-semibold text-slate-900 border-b border-slate-100 bg-amber-50';

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-data text-[10px] text-slate-400 tracking-[0.2em] uppercase">/ Datos Trimestrales</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{company?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                {periodLabel}
              </span>
              <button onClick={() => setSearchParams({ companyId })} className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
                Cambiar trimestre
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle className="w-4 h-4" /> Guardado
              </span>
            )}
            <Button onClick={handleSave} disabled={saving || !fiscalYearId}>
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Guardando…' : 'Guardar datos'}
            </Button>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
          <div>
            <span className="font-semibold">P&G acumulada: </span>
            ingresa los valores mensuales por separado — el sistema calculará el acumulado del trimestre.
            <span className="ml-2 font-semibold">Balance: </span>
            ingresa los valores al cierre del último mes del trimestre ({months[2] ?? ''}).
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {(['income', 'balance'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'income' ? 'Pérdidas y Ganancias' : 'Balance de Situación'}
            </button>
          ))}
        </div>

        {/* ── P&G Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'income' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200 min-w-[220px]">
                    Concepto
                  </th>
                  {months.map((m) => (
                    <th key={m} className={thClass}>{m}</th>
                  ))}
                  <th className={`${thClass} text-amber-700 bg-amber-50`}>Total T{quarter}</th>
                </tr>
              </thead>
              <tbody>
                {INCOME_FIELDS.map((f) => {
                  const total = incomeMonths.reduce((s, m) => s + m[f.key], 0);
                  return (
                    <tr key={f.key} className="hover:bg-slate-50/60 transition-colors">
                      <td className={`${tdLabel} ${f.isCost ? 'pl-6 text-slate-500' : 'font-semibold text-slate-900'}`}>
                        {f.label}
                      </td>
                      {months.map((_, mi) => (
                        <td key={mi} className={tdCell}>
                          <Cell
                            value={incomeMonths[mi][f.key]}
                            onChange={(v) => updateIncome(mi, f.key, v)}
                          />
                        </td>
                      ))}
                      <td className={tdTotal}>{total > 0 ? formatNum(total) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Balance Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'balance' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
              <p className="text-xs text-amber-800 font-medium">
                Balance al cierre de <strong>{months[2] ?? `${quarter}º mes`}</strong> {year}
              </p>
            </div>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200 min-w-[240px]">Concepto</th>
                  <th className={`${thClass} min-w-[160px]`}>{months[2] ?? ''} {year}</th>
                </tr>
              </thead>
              <tbody>
                {BALANCE_SECTIONS.map((section) => (
                  <React.Fragment key={section.title}>
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                        {section.title}
                      </td>
                    </tr>
                    {section.fields.map((f) => (
                      <tr key={f.key} className="hover:bg-slate-50/60 transition-colors">
                        <td className={`${tdLabel} pl-6`}>{f.label}</td>
                        <td className={tdCell}>
                          <Cell
                            value={balance[f.key as keyof BalanceSnap]}
                            onChange={(v) => setBalance((p) => ({ ...p, [f.key]: v }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
