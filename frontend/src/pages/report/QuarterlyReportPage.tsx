/**
 * QuarterlyReportPage
 * Visualiza los datos de un trimestre + genera informe IA trimestral.
 * Las comparaciones con años anteriores son solo de % (no cifras absolutas).
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { companyService } from '../../services/company.service';
import { financialService } from '../../services/financial.service';
import { CompanySelector } from '../../components/companies/CompanySelector';
import type { Company } from '../../types/company';
import {
  Calendar, AlertCircle, ChevronDown, RefreshCw,
  BarChart3, FileText, Scale,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const QUARTER_LABELS: Record<number, { label: string; months: string; color: string }> = {
  1: { label: 'T1', months: 'Enero — Marzo',     color: 'bg-blue-100 text-blue-800' },
  2: { label: 'T2', months: 'Abril — Junio',     color: 'bg-green-100 text-green-800' },
  3: { label: 'T3', months: 'Julio — Septiembre', color: 'bg-amber-100 text-amber-800' },
};

const fmtCurrency = (v: number | undefined, currency = 'EUR') => {
  if (!v) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
};

const fmtPct = (part: number, total: number) =>
  total !== 0 ? `${((part / total) * 100).toFixed(1)}%` : '—';

// ─── QuarterPicker ────────────────────────────────────────────────────────────
interface QuarterPickerProps {
  companyId: string;
  companyName: string;
  onSelect: (year: number, quarter: number) => void;
  onBack: () => void;
}
const QuarterPicker: React.FC<QuarterPickerProps> = ({ companyId, companyName, onSelect, onBack }) => {
  const [periods, setPeriods] = useState<Array<{ id: string; year: number; quarter: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    financialService.getQuarterlyFiscalYears(companyId)
      .then((fys) => setPeriods(fys.map((f: any) => ({ id: f.id, year: f.year, quarter: f.quarter })).sort((a: any, b: any) => b.year !== a.year ? b.year - a.year : b.quarter - a.quarter)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <p className="font-data text-[10px] text-amber-500/60 tracking-[0.2em] uppercase">/ Informe Trimestral</p>
            <h2 className="text-lg font-bold text-white leading-tight">{companyName}</h2>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
              </div>
            ) : periods.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm mb-3">No hay datos trimestrales ingresados aún.</p>
                <a href={`/datos-trimestrales?companyId=${companyId}`} className="text-amber-400 hover:text-amber-300 text-sm underline underline-offset-2 transition-colors">
                  Ingresar datos trimestrales
                </a>
              </div>
            ) : (
              <div className="space-y-2 mb-5">
                {periods.map((p) => {
                  const q = QUARTER_LABELS[p.quarter];
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelect(p.year, p.quarter)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${q?.color ?? 'bg-slate-700 text-slate-300'}`}>
                          {q?.label ?? `T${p.quarter}`}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white">{q?.label ?? `T${p.quarter}`} {p.year}</p>
                          <p className="text-xs text-slate-500">{q?.months}</p>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-600 group-hover:text-amber-400 -rotate-90 transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}

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
  income: any;
  currency: string;
  quarter: number;
  year: number;
}
const IncomeSummary: React.FC<IncomeSummaryProps> = ({ income, currency, quarter, year }) => {
  const rev   = Number(income.revenue ?? 0);
  const cogs  = Number(income.costOfSales ?? 0) + Number(income.staffCostsSales ?? 0);
  const admin = Number(income.adminExpenses ?? 0) + Number(income.staffCostsAdmin ?? 0);
  const dep   = Number(income.depreciation ?? 0);
  const grossMargin  = rev - cogs;
  const ebitda       = grossMargin - admin;
  const operatingRes = ebitda - dep;
  const finResult    = Number(income.financialIncome ?? 0) - Number(income.financialExpenses ?? 0);
  const excResult    = Number(income.exceptionalIncome ?? 0) - Number(income.exceptionalExpenses ?? 0);
  const ebt          = operatingRes + finResult + excResult;
  const netIncome    = ebt - Number(income.incomeTax ?? 0);

  const rows = [
    { label: 'Ventas',              value: rev,         pct: '100%',            bold: true },
    { label: 'Coste de ventas',     value: -cogs,       pct: fmtPct(cogs, rev),  indent: true },
    { label: 'Margen Bruto',        value: grossMargin, pct: fmtPct(grossMargin, rev), bold: true },
    { label: 'Gastos explotación',  value: -admin,      pct: fmtPct(admin, rev), indent: true },
    { label: 'EBITDA',              value: ebitda,      pct: fmtPct(ebitda, rev), bold: true },
    { label: 'Amortizaciones',      value: -dep,        pct: fmtPct(dep, rev),   indent: true },
    { label: 'Resultado Explotación', value: operatingRes, pct: fmtPct(operatingRes, rev), bold: true },
    { label: 'Resultado Financiero', value: finResult,  pct: fmtPct(Math.abs(finResult), rev), indent: true },
    { label: 'EBT',                 value: ebt,         pct: fmtPct(ebt, rev),   bold: true },
    { label: 'Impuesto Sociedades', value: -Number(income.incomeTax ?? 0), pct: fmtPct(Number(income.incomeTax ?? 0), rev), indent: true },
    { label: 'Resultado Neto',      value: netIncome,   pct: fmtPct(netIncome, rev), bold: true },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <h3 className="font-semibold text-slate-900 text-sm">Pérdidas y Ganancias Acumulada</h3>
        <span className="ml-auto text-xs text-slate-500">T{quarter} {year} · {QUARTER_LABELS[quarter]?.months}</span>
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
          <span className="font-semibold">Nota trimestral:</span> Los porcentajes (% s/Ventas) son comparables con cierres anuales anteriores.
          Las cifras en importes reflejan el período acumulado T{quarter} y no deben compararse directamente con importes de periodos anuales.
        </p>
      </div>
    </div>
  );
};

// ─── Balance sheet summary ────────────────────────────────────────────────────
interface BalanceSummaryProps {
  balance: any;
  currency: string;
  quarter: number;
  year: number;
}
const BalanceSummary: React.FC<BalanceSummaryProps> = ({ balance, currency, quarter, year }) => {
  const nc  = Number(balance.tangibleAssets ?? 0) + Number(balance.intangibleAssets ?? 0) + Number(balance.financialInvestmentsLp ?? 0) + Number(balance.otherNoncurrentAssets ?? 0);
  const ac  = Number(balance.inventory ?? 0) + Number(balance.accountsReceivable ?? 0) + Number(balance.otherReceivables ?? 0) + Number(balance.taxReceivables ?? 0) + Number(balance.cashEquivalents ?? 0);
  const ta  = nc + ac;
  const eq  = Number(balance.shareCapital ?? 0) + Number(balance.reserves ?? 0) + Number(balance.retainedEarnings ?? 0) - Number(balance.treasuryStock ?? 0);
  const ncl = Number(balance.provisionsLp ?? 0) + Number(balance.bankDebtLp ?? 0) + Number(balance.otherLiabilitiesLp ?? 0);
  const cl  = Number(balance.provisionsSp ?? 0) + Number(balance.bankDebtSp ?? 0) + Number(balance.accountsPayable ?? 0) + Number(balance.taxLiabilities ?? 0) + Number(balance.otherLiabilitiesSp ?? 0);
  const tp  = eq + ncl + cl;

  const sections = [
    {
      label: 'ACTIVO NO CORRIENTE', value: nc, pct: fmtPct(nc, ta), bold: true,
      children: [
        { label: 'Inmovilizado material',      value: Number(balance.tangibleAssets ?? 0) },
        { label: 'Inmovilizado inmaterial',     value: Number(balance.intangibleAssets ?? 0) },
        { label: 'Inversiones financieras LP',  value: Number(balance.financialInvestmentsLp ?? 0) },
        { label: 'Otro activo LP',              value: Number(balance.otherNoncurrentAssets ?? 0) },
      ],
    },
    {
      label: 'ACTIVO CORRIENTE', value: ac, pct: fmtPct(ac, ta), bold: true,
      children: [
        { label: 'Existencias',               value: Number(balance.inventory ?? 0) },
        { label: 'Clientes',                  value: Number(balance.accountsReceivable ?? 0) },
        { label: 'Otros deudores',            value: Number(balance.otherReceivables ?? 0) },
        { label: 'Activos fiscales CP',        value: Number(balance.taxReceivables ?? 0) },
        { label: 'Efectivo y equivalentes',    value: Number(balance.cashEquivalents ?? 0) },
      ],
    },
    {
      label: 'TOTAL ACTIVO', value: ta, pct: '100%', bold: true, separator: true,
      children: [],
    },
    {
      label: 'PATRIMONIO NETO', value: eq, pct: fmtPct(eq, tp), bold: true,
      children: [
        { label: 'Capital social',             value: Number(balance.shareCapital ?? 0) },
        { label: 'Reservas',                   value: Number(balance.reserves ?? 0) },
        { label: 'Resultado del ejercicio',     value: Number(balance.retainedEarnings ?? 0) },
        { label: 'Acciones propias (–)',        value: -Number(balance.treasuryStock ?? 0) },
      ],
    },
    {
      label: 'PASIVO NO CORRIENTE', value: ncl, pct: fmtPct(ncl, tp), bold: true,
      children: [
        { label: 'Deudas LP',                  value: Number(balance.bankDebtLp ?? 0) },
        { label: 'Provisiones LP',             value: Number(balance.provisionsLp ?? 0) },
        { label: 'Otros pasivos LP',           value: Number(balance.otherLiabilitiesLp ?? 0) },
      ],
    },
    {
      label: 'PASIVO CORRIENTE', value: cl, pct: fmtPct(cl, tp), bold: true,
      children: [
        { label: 'Deudas CP',                  value: Number(balance.bankDebtSp ?? 0) },
        { label: 'Proveedores',                value: Number(balance.accountsPayable ?? 0) },
        { label: 'Provisiones CP',             value: Number(balance.provisionsSp ?? 0) },
        { label: 'Pasivos fiscales CP',        value: Number(balance.taxLiabilities ?? 0) },
        { label: 'Otros pasivos CP',           value: Number(balance.otherLiabilitiesSp ?? 0) },
      ],
    },
    {
      label: 'TOTAL PASIVO + PN', value: tp, pct: '100%', bold: true, separator: true,
      children: [],
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Scale className="w-4 h-4 text-slate-400" />
        <h3 className="font-semibold text-slate-900 text-sm">Balance de Situación</h3>
        <span className="ml-auto text-xs text-slate-500">Al cierre de T{quarter} {year} · {QUARTER_LABELS[quarter]?.months?.split('—')[1]?.trim()}</span>
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
export const QuarterlyReportPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const companyId  = searchParams.get('companyId');
  const yearParam  = searchParams.get('year');
  const qParam     = searchParams.get('quarter');

  const [companies, setCompanies]           = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [company, setCompany]               = useState<Company | null>(null);
  const [fiscalYear, setFiscalYear]         = useState<any>(null);
  const [income, setIncome]                 = useState<any>(null);
  const [balance, setBalance]               = useState<any>(null);
  const [loading, setLoading]               = useState(false);

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
    if (!companyId || !yearParam || !qParam) return;
    const year = parseInt(yearParam);
    const quarter = parseInt(qParam);
    setLoading(true);
    (async () => {
      try {
        const allFys = await financialService.getFiscalYears(companyId);
        const fy = allFys.find((f: any) => f.year === year && (f.quarter ?? 0) === quarter);
        if (!fy) return;
        setFiscalYear(fy);
        const [inc, bal] = await Promise.all([
          financialService.getIncomeStatement(fy.id).catch(() => null),
          financialService.getBalanceSheet(fy.id).catch(() => null),
        ]);
        setIncome(inc);
        setBalance(bal);
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, yearParam, qParam]);

  // ── Step 1: no company ───────────────────────────────────────────────────
  if (!companyId) {
    return (
      <CompanySelector
        companies={companies}
        loading={loadingCompanies}
        onSelect={(c) => setSearchParams({ companyId: c.id })}
        title="Informe Trimestral"
        description="Selecciona una empresa para ver sus informes trimestrales"
        icon={<BarChart3 className="w-7 h-7 text-slate-900" />}
      />
    );
  }

  // ── Step 2: no quarter selected ──────────────────────────────────────────
  if (!yearParam || !qParam) {
    if (!company) return null;
    return (
      <QuarterPicker
        companyId={companyId}
        companyName={company.name}
        onSelect={(y, q) => setSearchParams({ companyId, year: String(y), quarter: String(q) })}
        onBack={() => setSearchParams({})}
      />
    );
  }

  const year    = parseInt(yearParam);
  const quarter = parseInt(qParam);
  const qInfo   = QUARTER_LABELS[quarter];

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
            <p className="font-data text-[10px] text-slate-400 tracking-[0.2em] uppercase mb-1">/ Informe Trimestral</p>
            <h1 className="text-2xl font-bold text-slate-900">{company?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${qInfo?.color ?? 'bg-slate-100'}`}>
                {qInfo?.label} {year}
              </span>
              <span className="text-sm text-slate-500">{qInfo?.months}</span>
              <button onClick={() => setSearchParams({ companyId })} className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 ml-2">
                Cambiar período
              </button>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => window.open(`/datos-trimestrales?companyId=${companyId}&year=${year}&quarter=${quarter}`, '_self')}
          >
            Editar datos
          </Button>
        </div>

        {/* Aviso de comparación */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <div>
            <span className="font-semibold">Análisis trimestral: </span>
            Las cifras en importes corresponden al período acumulado del trimestre y <strong>no son comparables en valor absoluto</strong> con cierres anuales.
            Sin embargo, los <strong>porcentajes sobre ventas sí son comparables</strong> con períodos anuales anteriores.
          </div>
        </div>

        {/* P&G */}
        {income ? (
          <IncomeSummary income={income} currency={company?.currency ?? 'EUR'} quarter={quarter} year={year} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            No hay datos de P&G ingresados para este período.
            <br />
            <a href={`/datos-trimestrales?companyId=${companyId}&year=${year}&quarter=${quarter}`} className="text-amber-600 underline mt-2 inline-block">
              Ingresar datos
            </a>
          </div>
        )}

        {/* Balance */}
        {balance ? (
          <BalanceSummary balance={balance} currency={company?.currency ?? 'EUR'} quarter={quarter} year={year} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            No hay datos de Balance ingresados para este período.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
