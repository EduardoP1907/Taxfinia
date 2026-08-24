/**
 * MonthlyReportPage (ruta: /informe-trimestral)
 *
 * Informe mensual acumulado, calculado siempre a partir del Forecast Mensual
 * (P&G y Balance mes a mes). El usuario elige un mes y el informe muestra:
 *  - P&G acumulado de enero hasta el mes elegido
 *  - Balance al cierre del mes elegido
 * Los meses ya cerrados usan el dato real introducido en el Forecast Mensual;
 * los meses futuros se calculan con las tasas de crecimiento configuradas ahí.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { companyService } from '../../services/company.service';
import {
  monthlyForecastService, MONTHS,
  type MonthlyForecastResult, type MonthlyPnLRow, type MonthlyBalanceRow,
} from '../../services/monthly-forecast.service';
import { CompanySelector } from '../../components/companies/CompanySelector';
import { MonthlyAIReportPanel } from '../../components/report/MonthlyAIReportPanel';
import type { Company } from '../../types/company';
import {
  CalendarDays, AlertCircle, RefreshCw, BarChart3, FileText, Scale,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const fmtCurrency = (v: number | undefined, currency = 'EUR') => {
  if (!v) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
};

const fmtPct = (part: number, total: number) =>
  total !== 0 ? `${((part / total) * 100).toFixed(1)}%` : '—';

const PNL_NUMERIC_KEYS = [
  'revenue', 'costOfSales', 'adminExpenses', 'grossMargin', 'operatingResult',
  'exceptionalIncome', 'exceptionalExpenses', 'exceptionalResult',
  'financialIncome', 'financialExpenses', 'financialResult',
  'ebt', 'incomeTax', 'netIncome',
] as const;

type AccumulatedPnL = Record<typeof PNL_NUMERIC_KEYS[number], number> & {
  allClosed: boolean;
  anyClosed: boolean;
};

function accumulatePnl(rows: MonthlyPnLRow[], uptoIdx: number): AccumulatedPnL {
  const acc = {} as AccumulatedPnL;
  for (const k of PNL_NUMERIC_KEYS) acc[k] = 0;
  for (let i = 0; i <= uptoIdx; i++) {
    for (const k of PNL_NUMERIC_KEYS) acc[k] += rows[i][k] as number;
  }
  const closedCount = rows.slice(0, uptoIdx + 1).filter((r) => r.isClosed).length;
  acc.allClosed = closedCount === uptoIdx + 1;
  acc.anyClosed = closedCount > 0;
  return acc;
}

// ─── MonthPicker ──────────────────────────────────────────────────────────────
interface MonthPickerProps {
  companyName: string;
  onSelect: (month: number) => void;
  onBack: () => void;
}
const MonthPicker: React.FC<MonthPickerProps> = ({ companyName, onSelect, onBack }) => {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <p className="font-data text-[10px] text-amber-500/60 tracking-[0.2em] uppercase">/ Informe Mensual</p>
            <h2 className="text-lg font-bold text-white leading-tight">{companyName}</h2>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="p-5">
            <p className="text-xs text-slate-500 mb-4">
              Elige el mes de {year} hasta el que quieres ver el informe acumulado (basado en el Forecast {year}).
            </p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => onSelect(i + 1)}
                  className="py-2.5 rounded-lg border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-sm font-semibold text-slate-200 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={onBack}
              className="w-full py-2.5 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-sm rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Income statement summary ─────────────────────────────────────────────────
interface IncomeSummaryProps {
  pnl: AccumulatedPnL;
  currency: string;
  month: number;
  year: number;
}
const IncomeSummary: React.FC<IncomeSummaryProps> = ({ pnl, currency, month, year }) => {
  const rev = pnl.revenue;

  const rows = [
    { label: 'Ventas', value: rev, pct: '100%', bold: true },
    { label: 'Coste de ventas', value: -pnl.costOfSales, pct: fmtPct(pnl.costOfSales, rev), indent: true },
    { label: 'Margen Bruto', value: pnl.grossMargin, pct: fmtPct(pnl.grossMargin, rev), bold: true },
    { label: 'Gastos de administración', value: -pnl.adminExpenses, pct: fmtPct(pnl.adminExpenses, rev), indent: true },
    { label: 'Resultado de Explotación', value: pnl.operatingResult, pct: fmtPct(pnl.operatingResult, rev), bold: true },
    { label: 'Resultado Excepcional', value: pnl.exceptionalResult, pct: fmtPct(Math.abs(pnl.exceptionalResult), rev), indent: true },
    { label: 'Resultado Financiero', value: pnl.financialResult, pct: fmtPct(Math.abs(pnl.financialResult), rev), indent: true },
    { label: 'Resultado antes de Impuestos', value: pnl.ebt, pct: fmtPct(pnl.ebt, rev), bold: true },
    { label: 'Impuesto Sociedades', value: -pnl.incomeTax, pct: fmtPct(pnl.incomeTax, rev), indent: true },
    { label: 'Resultado del Ejercicio', value: pnl.netIncome, pct: fmtPct(pnl.netIncome, rev), bold: true },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <h3 className="font-semibold text-slate-900 text-sm">Pérdidas y Ganancias Acumulada</h3>
        <span className="ml-auto text-xs text-slate-500">Ene — {MONTH_FULL[month - 1]} {year}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Concepto</th>
              <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Importe ({currency})</th>
              <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">% s/Ventas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b border-slate-100 ${r.bold ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                <td className={`px-5 py-2.5 text-sm ${r.bold ? 'font-bold text-slate-900' : 'text-slate-600 pl-8'}`}>{r.label}</td>
                <td className={`px-5 py-2.5 text-sm text-right ${r.value < 0 ? 'text-red-600' : r.value > 0 ? 'text-slate-900' : 'text-slate-400'} ${r.bold ? 'font-bold' : ''}`}>
                  {fmtCurrency(r.value, currency)}
                </td>
                <td className="px-5 py-2.5 text-sm text-right text-slate-500">{r.pct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 bg-blue-50 border-t border-blue-100">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">Nota: </span>
          {pnl.allClosed
            ? `Todos los meses incluidos son datos reales introducidos en el Forecast ${year}.`
            : pnl.anyClosed
            ? `Combina meses reales (cerrados) y meses proyectados con las tasas de crecimiento del Forecast ${year}.`
            : `Los importes son una proyección calculada con las tasas de crecimiento configuradas en el Forecast ${year}.`}
        </p>
      </div>
    </div>
  );
};

// ─── Balance sheet summary ────────────────────────────────────────────────────
interface BalanceSummaryProps {
  balance: MonthlyBalanceRow;
  currency: string;
  month: number;
  year: number;
}
const BalanceSummary: React.FC<BalanceSummaryProps> = ({ balance, currency, month, year }) => {
  const ta = balance.totalAssets;
  const tp = balance.totalEquityAndLiabilities;

  const sections = [
    {
      label: 'ACTIVO NO CORRIENTE', value: balance.totalNoncurrentAssets, pct: fmtPct(balance.totalNoncurrentAssets, ta), bold: true,
      children: [
        { label: 'Activo fijo (inmovilizado)', value: balance.fixedAssets },
        { label: 'Otros activos no corrientes', value: balance.otherNoncurrentAssets },
        { label: 'Inversiones financieras LP', value: balance.financialInvestmentsLp },
      ],
    },
    {
      label: 'ACTIVO CORRIENTE', value: balance.totalCurrentAssets, pct: fmtPct(balance.totalCurrentAssets, ta), bold: true,
      children: [
        { label: 'Existencias', value: balance.inventory },
        { label: 'Clientes y deudores', value: balance.accountsReceivable },
        { label: 'Otros Realizables', value: balance.otherReceivables },
        { label: 'Impuestos activo corriente', value: balance.taxReceivables },
        { label: 'Efectivo y equivalentes', value: balance.cashEquivalents },
      ],
    },
    { label: 'TOTAL ACTIVO', value: ta, pct: '100%', bold: true, separator: true, children: [] },
    {
      label: 'PATRIMONIO NETO', value: balance.equity, pct: fmtPct(balance.equity, tp), bold: true,
      children: [],
    },
    {
      label: 'PASIVO NO CORRIENTE', value: balance.totalNoncurrentLiabilities, pct: fmtPct(balance.totalNoncurrentLiabilities, tp), bold: true,
      children: [
        { label: 'Provisiones LP', value: balance.provisionsLp },
        { label: 'Deudas LP', value: balance.bankDebtLp },
        { label: 'Otros pasivos LP', value: balance.otherLiabilitiesLp },
      ],
    },
    {
      label: 'PASIVO CORRIENTE', value: balance.totalCurrentLiabilities, pct: fmtPct(balance.totalCurrentLiabilities, tp), bold: true,
      children: [
        { label: 'Provisiones CP', value: balance.provisionsSp },
        { label: 'Deudas CP', value: balance.bankDebtSp },
        { label: 'Proveedores', value: balance.accountsPayable },
        { label: 'Impuestos pasivo corriente', value: balance.taxLiabilities },
        { label: 'Otros pasivos CP', value: balance.otherLiabilitiesSp },
      ],
    },
    { label: 'TOTAL PATRIMONIO Y PASIVO', value: tp, pct: '100%', bold: true, separator: true, children: [] },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Scale className="w-4 h-4 text-slate-400" />
        <h3 className="font-semibold text-slate-900 text-sm">Balance de Situación</h3>
        <span className="ml-auto text-xs text-slate-500">Al cierre de {MONTH_FULL[month - 1]} {year}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Concepto</th>
              <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Importe ({currency})</th>
              <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">% s/Total</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s, si) => (
              <React.Fragment key={si}>
                <tr className={`border-b ${s.separator ? 'border-slate-300' : 'border-slate-100'} ${s.bold ? 'bg-slate-50' : ''}`}>
                  <td className={`px-5 py-2.5 text-sm font-bold text-slate-900 ${s.separator ? 'border-t-2 border-slate-200' : ''}`}>{s.label}</td>
                  <td className={`px-5 py-2.5 text-sm text-right font-bold ${s.value < 0 ? 'text-red-600' : 'text-slate-900'} ${s.separator ? 'border-t-2 border-slate-200' : ''}`}>{fmtCurrency(s.value, currency)}</td>
                  <td className={`px-5 py-2.5 text-sm text-right text-slate-500 ${s.separator ? 'border-t-2 border-slate-200' : ''}`}>{s.pct}</td>
                </tr>
                {s.children.map((c, ci) => (
                  c.value !== 0 && (
                    <tr key={ci} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-5 py-2 text-sm text-slate-600 pl-10">{c.label}</td>
                      <td className={`px-5 py-2 text-sm text-right ${c.value < 0 ? 'text-red-600' : 'text-slate-700'}`}>{fmtCurrency(c.value, currency)}</td>
                      <td className="px-5 py-2 text-sm text-right text-slate-400">{fmtPct(Math.abs(c.value), ta)}</td>
                    </tr>
                  )
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export const MonthlyReportPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const companyId = searchParams.get('companyId');
  const mParam = searchParams.get('month');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [result, setResult] = useState<MonthlyForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const year = new Date().getFullYear();

  useEffect(() => {
    companyService.getCompanies()
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoadingCompanies(false));
  }, []);

  useEffect(() => {
    if (!companyId) return;
    companyService.getCompany(companyId).then(setCompany).catch(console.error);
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !mParam) return;
    setLoading(true);
    setError(null);
    monthlyForecastService.calculate(companyId, year)
      .then(setResult)
      .catch((e) => setError(e?.response?.data?.error || e.message || `No se pudo calcular el Forecast ${year}`))
      .finally(() => setLoading(false));
  }, [companyId, mParam, year]);

  // ── Step 1: no company ───────────────────────────────────────────────────
  if (!companyId) {
    return (
      <CompanySelector
        companies={companies}
        loading={loadingCompanies}
        onSelect={(c) => setSearchParams({ companyId: c.id })}
        title="Informe Mensual"
        description="Selecciona una empresa para ver su informe mensual"
        icon={<BarChart3 className="w-7 h-7 text-slate-900" />}
      />
    );
  }

  // ── Step 2: no month selected ────────────────────────────────────────────
  if (!mParam) {
    if (!company) return null;
    return (
      <MonthPicker
        companyName={company.name}
        onSelect={(m) => setSearchParams({ companyId, month: String(m) })}
        onBack={() => setSearchParams({})}
      />
    );
  }

  const month = parseInt(mParam);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-data text-[10px] text-slate-400 tracking-[0.2em] uppercase mb-1">/ Informe Mensual</p>
            <h1 className="text-2xl font-bold text-slate-900">{company?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                Ene — {MONTH_FULL[month - 1]} {year}
              </span>
              <button onClick={() => setSearchParams({ companyId })} className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 ml-2">
                Cambiar mes
              </button>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => window.open(`/forecast-mensual?companyId=${companyId}`, '_self')}
          >
            Editar Forecast
          </Button>
        </div>

        {error ? (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <div>
              <span className="font-semibold">No hay datos disponibles: </span>
              {error}
              <br />
              <a href={`/forecast-mensual?companyId=${companyId}`} className="text-amber-700 underline mt-2 inline-block">
                Configurar Forecast {year}
              </a>
            </div>
          </div>
        ) : result ? (
          <>
            <MonthlyAIReportPanel
              companyId={companyId}
              companyName={company?.name ?? ''}
              year={year}
            />
            <IncomeSummary
              pnl={accumulatePnl(result.pnl, month - 1)}
              currency={company?.currency ?? 'EUR'}
              month={month}
              year={year}
            />
            <BalanceSummary
              balance={result.balance[month - 1]}
              currency={company?.currency ?? 'EUR'}
              month={month}
              year={year}
            />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
};
