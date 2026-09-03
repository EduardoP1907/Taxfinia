import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { CompanySelector } from '../../components/companies/CompanySelector';
import { companyService } from '../../services/company.service';
import type { Company } from '../../types/company';
import {
  monthlyForecastService, mergeConfig, MONTHS, calcPnLClient, calcBalanceClient,
  type MonthlyForecastConfig, type MonthlyForecastResult, type MonthlyPnLRow,
  type MonthlyBalanceRow, type BalanceOverrideKey,
} from '../../services/monthly-forecast.service';
import { evaluateArithmeticExpression } from '../../utils/arithmetic';
import {
  CalendarDays, RefreshCw, Save, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
} from 'lucide-react';

// ─── Formatting ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(n));

// ─── P&G concept definitions ─────────────────────────────────────────────────

interface PnLConcept {
  label: string;
  resultKey: keyof MonthlyForecastResult['pnl'][0]; // what to display in result rows
  rateKey?: keyof MonthlyForecastConfig;            // rate config field
  actualKey?: keyof MonthlyForecastConfig;          // actual data field
  isTotal?: boolean;
  isSubtotal?: boolean;
  indent?: boolean;
  sign?: 'positive' | 'negative';                  // drives optional color
}

const PNL_CONCEPTS: PnLConcept[] = [
  {
    label: 'Ingresos por ventas (+)',
    resultKey: 'revenue',
    rateKey: 'rateRevenue',
    actualKey: 'actualRevenue',
    sign: 'positive',
  },
  {
    label: 'Coste de las ventas (−)',
    resultKey: 'costOfSales',
    rateKey: 'rateCostOfSales',
    actualKey: 'actualCostOfSales',
    indent: true,
    sign: 'negative',
  },
  {
    label: 'Margen bruto',
    resultKey: 'grossMargin',
    isSubtotal: true,
  },
  {
    label: 'Gastos de administración (−)',
    resultKey: 'adminExpenses',
    rateKey: 'rateAdminExpenses',
    actualKey: 'actualAdminExpenses',
    indent: true,
    sign: 'negative',
  },
  {
    label: 'Resultado de explotación',
    resultKey: 'operatingResult',
    isSubtotal: true,
  },
  {
    label: 'Ingresos excepcionales (+)',
    resultKey: 'exceptionalIncome',
    rateKey: 'rateExceptionalIncome',
    actualKey: 'actualExceptionalIncome',
    indent: true,
    sign: 'positive',
  },
  {
    label: 'Gastos excepcionales (−)',
    resultKey: 'exceptionalExpenses',
    rateKey: 'rateExceptionalExpenses',
    actualKey: 'actualExceptionalExpenses',
    indent: true,
    sign: 'negative',
  },
  {
    label: 'Resultado excepcional',
    resultKey: 'exceptionalResult',
    isSubtotal: true,
  },
  {
    label: 'Ingresos financieros (+)',
    resultKey: 'financialIncome',
    rateKey: 'rateFinancialIncome',
    actualKey: 'actualFinancialIncome',
    indent: true,
    sign: 'positive',
  },
  {
    label: 'Gastos financieros (−)',
    resultKey: 'financialExpenses',
    rateKey: 'rateFinancialExpenses',
    actualKey: 'actualFinancialExpenses',
    indent: true,
    sign: 'negative',
  },
  {
    label: 'Resultado financiero',
    resultKey: 'financialResult',
    isSubtotal: true,
  },
  {
    label: 'Resultado antes de impuestos',
    resultKey: 'ebt',
    isTotal: true,
  },
  {
    label: 'Impuestos s/ beneficios (−)',
    resultKey: 'incomeTax',
    rateKey: 'rateIncomeTax',
    actualKey: 'actualIncomeTax',
    indent: true,
    sign: 'negative',
  },
  {
    label: 'Resultado del ejercicio',
    resultKey: 'netIncome',
    isTotal: true,
  },
];

// ─── Balance structure ────────────────────────────────────────────────────────

interface BalanceLine {
  label: string;
  key: keyof MonthlyForecastResult['balance'][0];
  isTotal?: boolean;
  isSubtotal?: boolean;
  indent?: boolean;
  driver?: 'revenue' | 'costs' | 'fixed';
  editable?: boolean;
}

const BALANCE_ASSETS: BalanceLine[] = [
  { label: 'A) ACTIVO NO CORRIENTE', key: 'totalNoncurrentAssets', isSubtotal: true },
  { label: 'Activo fijo (inmovilizado)', key: 'fixedAssets', indent: true, driver: 'revenue', editable: true },
  { label: 'Otros activos no corrientes', key: 'otherNoncurrentAssets', indent: true, driver: 'revenue', editable: true },
  { label: 'Inversiones financieras LP', key: 'financialInvestmentsLp', indent: true, driver: 'revenue', editable: true },
  { label: 'B) ACTIVO CORRIENTE', key: 'totalCurrentAssets', isSubtotal: true },
  { label: 'Existencias', key: 'inventory', indent: true, driver: 'costs', editable: true },
  { label: 'Clientes y deudores', key: 'accountsReceivable', indent: true, driver: 'revenue', editable: true },
  { label: 'Otros Realizables', key: 'otherReceivables', indent: true, driver: 'revenue', editable: true },
  { label: 'Impuestos activo corriente', key: 'taxReceivables', indent: true, driver: 'revenue', editable: true },
  { label: 'Disponible (tesorería)', key: 'cashEquivalents', indent: true, driver: 'revenue', editable: true },
  { label: 'TOTAL ACTIVO', key: 'totalAssets', isTotal: true },
];

const BALANCE_LIABILITIES: BalanceLine[] = [
  { label: 'A) PATRIMONIO NETO', key: 'equity', isSubtotal: true, editable: true },
  { label: 'B) PASIVO NO CORRIENTE', key: 'totalNoncurrentLiabilities', isSubtotal: true },
  { label: 'Provisiones LP', key: 'provisionsLp', indent: true, driver: 'revenue', editable: true },
  { label: 'Deudas LP', key: 'bankDebtLp', indent: true, driver: 'revenue', editable: true },
  { label: 'Otros pasivos LP', key: 'otherLiabilitiesLp', indent: true, driver: 'revenue', editable: true },
  { label: 'C) PASIVO CORRIENTE', key: 'totalCurrentLiabilities', isSubtotal: true },
  { label: 'Provisiones CP', key: 'provisionsSp', indent: true, driver: 'revenue', editable: true },
  { label: 'Deudas CP', key: 'bankDebtSp', indent: true, driver: 'revenue', editable: true },
  { label: 'Proveedores', key: 'accountsPayable', indent: true, driver: 'costs', editable: true },
  { label: 'Impuestos pasivo corriente', key: 'taxLiabilities', indent: true, driver: 'revenue', editable: true },
  { label: 'Otros pasivos CP', key: 'otherLiabilitiesSp', indent: true, driver: 'revenue', editable: true },
  { label: 'TOTAL PATRIMONIO Y PASIVO', key: 'totalEquityAndLiabilities', isTotal: true },
  { label: 'Descuadratura', key: 'imbalance', isSubtotal: true },
];

// ─── Cell components ──────────────────────────────────────────────────────────

// Editable cell for closed-month actual values
const ActualInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
}> = ({ value, onChange }) => {
  const [local, setLocal] = useState(value === 0 ? '' : String(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(value === 0 ? '' : String(value));
  }, [value]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={local}
      placeholder="0"
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const parsed = evaluateArithmeticExpression(local);
        const value = parsed ?? 0;
        onChange(value);
        setLocal(value === 0 ? '' : String(value));
      }}
      className="w-full text-right text-xs border border-green-300 rounded px-1 py-0.5 bg-green-50
                 focus:outline-none focus:ring-1 focus:ring-green-500 focus:bg-white
                 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
};

// Rate input (%) for the FORECAST parameters section
const RateInput: React.FC<{
  value: number; // decimal: 0.05 = 5%
  onChange: (v: number) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const pct = (value * 100).toFixed(1);
  const [local, setLocal] = useState(pct);

  useEffect(() => { setLocal((value * 100).toFixed(1)); }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const parsed = evaluateArithmeticExpression(local);
        onChange((parsed ?? 0) / 100);
      }}
      className="w-full text-center text-xs border border-slate-200 rounded px-0.5 py-0.5
                 focus:outline-none focus:ring-1 focus:ring-amber-400
                 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
                 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
};

// Editable cell for the projected balance — overrides the calculated value.
// Empty input = no override, falls back to the calculated value (shown as placeholder).
const BalanceOverrideInput: React.FC<{
  value: number | null;
  computed: number;
  onChange: (v: number | null) => void;
}> = ({ value, computed, onChange }) => {
  const [local, setLocal] = useState(value === null ? '' : String(value));

  useEffect(() => {
    setLocal(value === null ? '' : String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      placeholder={fmt(computed)}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        if (local.trim() === '') {
          onChange(null);
          return;
        }
        const parsed = evaluateArithmeticExpression(local);
        onChange(parsed);
        if (parsed === null) setLocal('');
        else setLocal(String(parsed));
      }}
      className="w-full text-right text-xs border border-slate-200 rounded px-1 py-0.5 bg-white
                 focus:outline-none focus:ring-1 focus:ring-amber-400
                 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
};

// ─── Outer page: company selection via URL ────────────────────────────────────

export const MonthlyForecastPage: React.FC = () => {
  return (
    <MonthlyForecastShell
      year={new Date().getFullYear()}
      titlePrefix="Forecast"
      companySelectorDescription="Selecciona la empresa para ver o crear su proyección mensual"
    />
  );
};

// ─── Shell: company selection via URL, shared by Forecast and Budget ─────────

export const MonthlyForecastShell: React.FC<{
  year: number;
  titlePrefix: string;
  companySelectorDescription: string;
  mode?: 'forecast' | 'budget';
}> = ({ year, titlePrefix, companySelectorDescription, mode = 'forecast' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    companyService.getCompanies()
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoadingCompanies(false));
  }, []);

  const companyId = searchParams.get('companyId');
  const selectedCompany = companies.find(c => c.id === companyId) ?? null;

  if (!companyId) {
    return (
      <CompanySelector
        companies={companies}
        loading={loadingCompanies}
        onSelect={company => {
          const p = new URLSearchParams(searchParams);
          p.set('companyId', company.id);
          setSearchParams(p);
        }}
        title={`${titlePrefix} ${year}`}
        description={companySelectorDescription}
        icon={<CalendarDays className="w-7 h-7 text-slate-900" />}
      />
    );
  }

  return (
    <MonthlyForecastContent
      companyId={companyId}
      companyName={selectedCompany?.name ?? companyId}
      year={year}
      titlePrefix={titlePrefix}
      mode={mode}
    />
  );
};

// ─── Inner content (renders once companyId is known) ─────────────────────────

const MonthlyForecastContent: React.FC<{
  companyId: string;
  companyName: string;
  year: number;
  titlePrefix: string;
  mode?: 'forecast' | 'budget';
}> = ({
  companyId,
  companyName,
  year,
  titlePrefix,
  mode = 'forecast',
}) => {
  const isBudget = mode === 'budget';
  const [config, setConfig] = useState<MonthlyForecastConfig | null>(null);
  const [result, setResult] = useState<MonthlyForecastResult | null>(null);
  const [baseYear, setBaseYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'pnl' | 'balance'>('pnl');
  const [ratesOpen, setRatesOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadAndCalculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = await monthlyForecastService.get(companyId, year);
      setConfig(mergeConfig(stored));
      const calc = await monthlyForecastService.calculate(companyId, year, mode);
      setResult(calc);
      setBaseYear(calc.baseYear ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [companyId, year, mode]);

  useEffect(() => { loadAndCalculate(); }, [loadAndCalculate]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      await monthlyForecastService.save(companyId, year, config);
      const calc = await monthlyForecastService.calculate(companyId, year, mode);
      setResult(calc);
      setBaseYear(calc.baseYear ?? null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const setActual = (key: keyof MonthlyForecastConfig, m: number, v: number) => {
    if (!config) return;
    const arr = [...(config[key] as number[])];
    arr[m] = v;
    setConfig({ ...config, [key]: arr });
  };

  const setRate = (key: keyof MonthlyForecastConfig, m: number, v: number) => {
    if (!config) return;
    const arr = [...(config[key] as number[])];
    arr[m] = v;
    setConfig({ ...config, [key]: arr });
  };

  const setBalanceOverride = (key: BalanceOverrideKey, m: number, v: number | null) => {
    if (!config) return;
    const arr = [...(config.balanceOverrides[key] ?? Array(12).fill(null))];
    arr[m] = v;
    setConfig({ ...config, balanceOverrides: { ...config.balanceOverrides, [key]: arr } });
  };


  // Budget has no "closed months" concept — every month is rate-driven, and
  // only the growth-rate cells are editable (no actual-value entry, no
  // balance overrides).
  const closedMonths = isBudget ? 0 : (config?.closedMonths ?? 0);

  // True when loading finished but there's no annual base data (calculate threw)
  const noBaseData = !loading && !result;

  // Centralizes "is this month editable as a real/override value" across the
  // P&G and Balance tables. Budget is always fully rate-driven (never closed).
  const isClosedMonth = useCallback(
    (i: number) => (isBudget ? false : ((noBaseData && closedMonths === 0) ? true : i < closedMonths)),
    [isBudget, noBaseData, closedMonths],
  );

  // Live P&G computed client-side so rate changes are instant (no save required).
  // When there's no annual base, treat all 12 months as direct-entry (closedMonths=12)
  // using zero as base — the user types actual values and subtotals derive from them.
  // (Budget always uses closedMonths=0 — it never falls back to direct entry.)
  const livePnl = useMemo<MonthlyPnLRow[]>(() => {
    if (!config) return [];
    const emptyBase = {
      revenue: 0, costOfSales: 0, adminExpenses: 0,
      exceptionalIncome: 0, exceptionalExpenses: 0,
      financialIncome: 0, financialExpenses: 0, incomeTax: 0,
    };
    const base = result?.annualPnL ?? emptyBase;
    const effectiveConfig = isBudget
      ? { ...config, closedMonths: 0 }
      : ((noBaseData && closedMonths === 0) ? { ...config, closedMonths: 12 } : config);
    return calcPnLClient(effectiveConfig, base, isBudget);
  }, [config, result, noBaseData, isBudget, closedMonths]);

  // Live Balance computed client-side from the live P&G + current overrides,
  // so editing e.g. Activo Fijo instantly updates Activo No Corriente (and
  // every other dependent total) without requiring "Guardar y recalcular".
  const liveBalance = useMemo<MonthlyBalanceRow[]>(() => {
    if (!config || !result || livePnl.length === 0) return [];
    return calcBalanceClient(
      result.annualBalance,
      result.annualPnL.revenue,
      result.annualPnL.costOfSales,
      livePnl,
      config.balanceOverrides,
    );
  }, [config, result, livePnl]);

  const annualTotal = (key: keyof MonthlyPnLRow) =>
    livePnl.reduce((s, row) => s + (row[key] as number), 0);

  return (
    <DashboardLayout>
      <div className="max-w-full px-4 py-6 space-y-4">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-500" />
              {titlePrefix} {year}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{companyName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Base year badge */}
            {baseYear && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200">
                {isBudget ? 'Base: Forecast ' : 'Base de datos: '}
                <strong className="text-slate-700">{baseYear}</strong>
              </span>
            )}

            {/* Closed months: controls split between actual entry and auto-projection.
                Budget has no closed-month concept — it's always fully rate-driven. */}
            {config && !isBudget && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Meses cerrados:</span>
                <select
                  value={closedMonths}
                  onChange={e => setConfig({ ...config, closedMonths: parseInt(e.target.value) })}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value={0}>Ninguno (todo editable)</option>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1} — hasta {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || loading || !config}
              className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600
                         text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              Guardar y recalcular
            </button>
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center gap-5 text-xs text-slate-500">
          {!isBudget && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
              Mes cerrado — introduce el dato real
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
            {isBudget
              ? `Valor calculado automáticamente según las tasas ${titlePrefix.toUpperCase()} de abajo, a partir del Forecast ${baseYear ?? year - 1}`
              : 'Mes proyectado — valor calculado automáticamente según las tasas FORECAST de abajo'}
          </span>
        </div>

        {/* ── Alerts ── */}
        {error && (() => {
          const isNoData = error.includes('datos financieros anuales') || error.includes('datos de Forecast');
          return (
            <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm border ${
              isNoData
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                {isNoData && (
                  <p className="text-xs mt-1 opacity-80">
                    {isBudget
                      ? `Completa primero el Forecast ${year - 1} (con sus meses cerrados y tasas de crecimiento) — el Budget ${year} se construye a partir de su resultado anual.`
                      : 'Introduce los datos reales en la tabla y usa «Meses cerrados» para indicar hasta qué mes tienes datos — los meses siguientes se proyectarán automáticamente usando los porcentajes de crecimiento de cada celda.'}
                  </p>
                )}
              </div>
            </div>
          );
        })()}
        {saved && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Guardado y recalculado correctamente
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-1">
            {([
              { id: 'pnl' as const, label: 'Proyección P&G' },
              { id: 'balance' as const, label: 'Balance Proyectado' },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 1 — Proyección P&G (FCASTPPGG2026)
        ════════════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'pnl' && config && (
          <div className="space-y-6">

            {/* ── Section A: P&G results table ── */}
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-amber-400 rounded-full inline-block" />
                Pérdidas y Ganancias — Proyección mensual
                {livePnl.length > 0 && (
                  <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ● En tiempo real
                  </span>
                )}
              </h2>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-left px-3 py-2.5 w-52 sticky left-0 bg-slate-800 z-10 font-medium">
                        Concepto
                      </th>
                      {MONTHS.map((m, i) => (
                        <th
                          key={m}
                          className={`px-1 py-2.5 text-center w-[72px] font-medium ${
                            isClosedMonth(i) ? 'text-green-300' : 'text-slate-300'
                          }`}
                        >
                          <span className="block">{m}</span>
                          <span className="block text-[9px] font-normal mt-0.5">
                            {isClosedMonth(i) ? 'Real' : 'Proy.'}
                          </span>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-right w-24 bg-slate-700 font-medium">
                        Total anual
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {PNL_CONCEPTS.map(concept => {
                      const isSection = concept.isTotal || concept.isSubtotal;
                      const rowBg = concept.isTotal
                        ? 'bg-slate-100'
                        : concept.isSubtotal
                        ? 'bg-slate-50'
                        : 'bg-white';
                      const rowWeight = isSection ? 'font-semibold' : 'font-normal';

                      return (
                        <tr
                          key={concept.resultKey}
                          className={`${rowBg} border-t border-slate-100 ${rowWeight}`}
                        >
                          {/* Label */}
                          <td
                            className={`px-3 py-1.5 sticky left-0 z-10 ${rowBg} text-slate-800 ${
                              concept.indent ? 'pl-6 text-slate-600' : ''
                            }`}
                          >
                            {concept.label}
                          </td>

                          {/* Month cells */}
                          {livePnl.length > 0
                            ? MONTHS.map((_, i) => {
                                const row = livePnl[i];
                                const val = row[concept.resultKey] as number;
                                const isClosed = isClosedMonth(i);

                                // Mes cerrado + fila de datos → input editable (verde)
                                if (isClosed && concept.actualKey && !isSection) {
                                  return (
                                    <td key={i} className="px-1 py-1 bg-green-50">
                                      <ActualInput
                                        value={(config[concept.actualKey] as number[])[i]}
                                        onChange={v => setActual(concept.actualKey!, i, v)}
                                      />
                                    </td>
                                  );
                                }

                                // Mes proyectado o subtotal → valor calculado (solo lectura)
                                const textColor = isSection
                                  ? (val < 0 ? 'text-red-600' : 'text-slate-800')
                                  : (val < 0 ? 'text-red-500' : 'text-slate-600');
                                const display = (!isClosed && val === 0 && !isSection) ? '—' : fmt(val);
                                return (
                                  <td
                                    key={i}
                                    className={`px-2 py-1.5 text-right ${
                                      isClosed ? 'bg-green-50' : ''
                                    } ${textColor}`}
                                  >
                                    {display}
                                  </td>
                                );
                              })
                            : MONTHS.map((_, i) => (
                                <td key={i} className="px-2 py-1.5 text-right text-slate-300">
                                  —
                                </td>
                              ))}

                          {/* Annual total */}
                          {livePnl.length > 0 ? (
                            <td
                              className={`px-3 py-1.5 text-right bg-slate-50 ${rowWeight} ${
                                annualTotal(concept.resultKey) < 0 ? 'text-red-600' : 'text-slate-800'
                              }`}
                            >
                              {fmt(annualTotal(concept.resultKey))}
                            </td>
                          ) : (
                            <td className="px-3 py-1.5 text-right text-slate-300">—</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-slate-400 -mt-2">
              {isBudget
                ? `Todos los meses se calculan a partir del resultado anual del Forecast ${baseYear ?? year - 1} aplicando las tasas de crecimiento de la sección de abajo.`
                : 'Los meses cerrados muestran el dato real introducido (verde). Los meses proyectados calculan el valor a partir del último mes real usando las tasas de la sección FORECAST.'}
              {' '}Ajusta las tasas abajo y pulsa «Guardar y recalcular» para persistir y actualizar el balance.
            </p>

            {/* ── Section B: Tasas de crecimiento (edición masiva) ── */}
            <div>
              <button
                onClick={() => setRatesOpen(v => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2 hover:text-slate-900 transition-colors"
              >
                <span className="w-1.5 h-5 bg-blue-400 rounded-full inline-block" />
                {titlePrefix.toUpperCase()} — Tasas de crecimiento mensual (%)
                {ratesOpen
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {ratesOpen && (
                <div className="overflow-x-auto rounded-xl border border-blue-100 shadow-sm">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-slate-700 text-white">
                        <th className="text-left px-3 py-2 w-52 sticky left-0 bg-slate-700 z-10 font-medium">
                          Concepto
                        </th>
                        {MONTHS.map((m, i) => (
                          <th
                            key={m}
                            className={`px-1 py-2 text-center w-[72px] font-medium ${
                              isClosedMonth(i) || (i === 0 && !isBudget) ? 'text-slate-400' : 'text-blue-200'
                            }`}
                          >
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {PNL_CONCEPTS.filter(c => c.rateKey).map(concept => {
                        const rateArr = config[concept.rateKey!] as number[];

                        return (
                          <tr
                            key={concept.resultKey}
                            className="border-t border-slate-100 bg-white hover:bg-slate-50"
                          >
                            <td className="px-3 py-1.5 sticky left-0 bg-white z-10 text-slate-700">
                              {concept.label}
                            </td>

                            {rateArr.map((rate, i) => {
                              // In Forecast mode, January is always anchored to the annual
                              // base ÷ 12 (matches the Excel FCASTPPGG row 4 formula) — it
                              // never grows from a previous month, so its rate is
                              // structurally a no-op there. In Budget mode there are no
                              // closed months, so January's own rate is applied over that
                              // base average and remains editable.
                              const inert = isClosedMonth(i) || (i === 0 && !isBudget);
                              return (
                                <td
                                  key={i}
                                  className={`px-1 py-1 ${inert ? 'bg-slate-50' : 'bg-blue-50/40'}`}
                                >
                                  <div className="flex items-center gap-0.5" title={i === 0 && !isBudget && !isClosedMonth(0) ? 'Enero usa el promedio anual como base — no aplica tasa' : undefined}>
                                    <RateInput
                                      value={rate}
                                      onChange={v => setRate(concept.rateKey!, i, v)}
                                      disabled={inert}
                                    />
                                    <span className="text-[10px] text-slate-400 shrink-0">%</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-slate-400 mt-2">
                {!isBudget && 'Los meses cerrados (en gris) ignoran la tasa — usa el dato real introducido arriba. '}
                Los meses proyectados aplican: <code className="bg-slate-100 px-1 rounded">Mes N = Mes (N−1) × (1 + tasa)</code>.{' '}
                {isBudget
                  ? 'Enero parte del promedio anual (Total base ÷ 12) y aplica su propia tasa de crecimiento sobre ese promedio.'
                  : 'Enero (gris) no tiene mes anterior del cual crecer — siempre parte del promedio anual (Total base ÷ 12), por eso su tasa está deshabilitada y no afecta al resultado.'}
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2 — Balance Proyectado (FCASTBCE2026)
        ════════════════════════════════════════════════════════════ */}
        {!loading && activeTab === 'balance' && (
          <div className="space-y-4">
            <div className="flex items-center gap-5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
                Driver: evolución de ventas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-300" />
                Driver: evolución de costes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                Patrimonio Neto + resultado acumulado
              </span>
              {liveBalance.length > 0 && (
                <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ● En tiempo real
                </span>
              )}
            </div>

            {result && liveBalance.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-left px-3 py-2.5 w-56 sticky left-0 bg-slate-800 z-10 font-medium">
                        Partida
                      </th>
                      {MONTHS.map((m, i) => (
                        <th
                          key={m}
                          className={`px-2 py-2.5 text-right w-20 font-medium ${
                            isClosedMonth(i) ? 'text-green-300' : 'text-slate-300'
                          }`}
                        >
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {/* ACTIVO */}
                    <tr className="bg-slate-700 text-white">
                      <td
                        colSpan={13}
                        className="px-3 py-1.5 font-semibold text-[11px] tracking-wide sticky left-0 bg-slate-700 z-10"
                      >
                        ACTIVO
                      </td>
                    </tr>
                    {BALANCE_ASSETS.map(line => {
                      const rowBg = line.isTotal
                        ? 'bg-slate-100 font-bold'
                        : line.isSubtotal
                        ? 'bg-slate-50 font-semibold'
                        : 'bg-white';
                      const driverColor =
                        line.driver === 'costs'
                          ? 'bg-orange-300'
                          : line.driver === 'fixed'
                          ? 'bg-slate-300'
                          : 'bg-blue-300';

                      return (
                        <tr key={line.key} className={`${rowBg} border-t border-slate-100`}>
                          <td
                            className={`px-3 py-1.5 sticky left-0 z-10 ${rowBg} ${
                              line.indent ? 'pl-5 text-slate-600' : 'text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {line.driver && !line.isTotal && !line.isSubtotal && (
                                <span className={`w-2 h-2 rounded-full shrink-0 ${driverColor}`} />
                              )}
                              {line.label}
                            </div>
                          </td>
                          {liveBalance.map((month, i) => {
                            const computed = month[line.key] as number;
                            const isClosed = isClosedMonth(i);
                            if (line.editable && config && isClosed) {
                              const key = line.key as BalanceOverrideKey;
                              return (
                                <td key={i} className="px-1 py-1 bg-green-50">
                                  <BalanceOverrideInput
                                    value={config.balanceOverrides[key]?.[i] ?? null}
                                    computed={computed}
                                    onChange={v => setBalanceOverride(key, i, v)}
                                  />
                                </td>
                              );
                            }
                            return (
                              <td
                                key={i}
                                className={`px-2 py-1.5 text-right ${isClosed ? 'bg-green-50' : ''}`}
                              >
                                {fmt(computed)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* PATRIMONIO Y PASIVO */}
                    <tr className="bg-slate-700 text-white">
                      <td
                        colSpan={13}
                        className="px-3 py-1.5 font-semibold text-[11px] tracking-wide sticky left-0 bg-slate-700 z-10"
                      >
                        PATRIMONIO NETO Y PASIVO
                      </td>
                    </tr>
                    {BALANCE_LIABILITIES.map(line => {
                      const isImbalance = line.key === 'imbalance';
                      const rowBg = line.isTotal
                        ? 'bg-slate-100 font-bold'
                        : line.isSubtotal
                        ? 'bg-slate-50 font-semibold'
                        : 'bg-white';
                      const driverColor =
                        line.driver === 'costs'
                          ? 'bg-orange-300'
                          : line.driver === 'fixed'
                          ? 'bg-slate-300'
                          : 'bg-blue-300';

                      return (
                        <tr
                          key={line.key}
                          className={`${rowBg} border-t ${
                            isImbalance ? 'border-t-2 border-amber-300' : 'border-slate-100'
                          }`}
                        >
                          <td
                            className={`px-3 py-1.5 sticky left-0 z-10 ${rowBg} ${
                              line.indent ? 'pl-5 text-slate-600' : 'text-slate-800'
                            } ${isImbalance ? 'text-amber-700 italic' : ''}`}
                          >
                            <div className="flex items-center gap-1.5">
                              {line.driver && !line.isTotal && !line.isSubtotal && !isImbalance && (
                                <span className={`w-2 h-2 rounded-full shrink-0 ${driverColor}`} />
                              )}
                              {line.label}
                            </div>
                          </td>
                          {liveBalance.map((month, i) => {
                            const val = month[line.key] as number;
                            const isClosed = isClosedMonth(i);
                            if (line.editable && config && isClosed) {
                              const key = line.key as BalanceOverrideKey;
                              return (
                                <td key={i} className="px-1 py-1 bg-green-50">
                                  <BalanceOverrideInput
                                    value={config.balanceOverrides[key]?.[i] ?? null}
                                    computed={val}
                                    onChange={v => setBalanceOverride(key, i, v)}
                                  />
                                </td>
                              );
                            }
                            return (
                              <td
                                key={i}
                                className={`px-2 py-1.5 text-right ${
                                  isClosed ? 'bg-green-50' : ''
                                } ${isImbalance && val !== 0 ? 'text-amber-600 font-medium' : ''}`}
                              >
                                {fmt(val)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
                <AlertCircle className="w-4 h-4" />
                Guarda primero la proyección P&G para ver el balance calculado
              </div>
            )}

            <p className="text-xs text-slate-400">
              {isBudget
                ? 'El balance se calcula automáticamente a partir del cierre proyectado del Forecast y las tasas de crecimiento — no es editable directamente aquí. Ajusta las tasas en la pestaña Proyección P&G y pulsa «Guardar y recalcular».'
                : 'Solo los meses cerrados (en verde) son editables: escribe un valor para sobrescribir el cálculo de ese mes, o deja la casilla vacía para usar el valor calculado. Los meses proyectados se calculan automáticamente según la evolución de ventas/costes y no se pueden editar directamente — ajusta «Meses cerrados» arriba para habilitar más meses. Pulsa «Guardar y recalcular» para aplicar los cambios.'}
              El Activo Fijo absorbe automáticamente cualquier descuadre (igual que la fórmula CUADRATURA de la hoja FCASTBCE2026) mientras no lo sobrescribas manualmente, por lo que Total Activo = Total Pasivo + Patrimonio Neto todos los meses.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
