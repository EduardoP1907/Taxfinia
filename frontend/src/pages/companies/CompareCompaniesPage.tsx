import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { companyService } from '../../services/company.service';
import api from '../../services/api';
import type { Company } from '../../types/company';
import { ArrowLeftRight, Building2, RefreshCw } from 'lucide-react';

interface CompareResult {
  company: { id: string; name: string; currency: string; industry: string | null };
  year: number;
  hasData: boolean;
  income: { revenue: number | null; ebitda: number | null; netIncome: number | null } | null;
  balance: { totalAssets: number | null; equity: number | null } | null;
  ratios: {
    currentRatio: number | null;
    quickRatio: number | null;
    debtToEquity: number | null;
    debtToEbitda: number | null;
    roe: number | null;
    roa: number | null;
    grossMargin: number | null;
    ebitdaMargin: number | null;
    netMargin: number | null;
    assetTurnover: number | null;
    altmanZScore: number | null;
    daysSalesOutstanding: number | null;
    daysPayableOutstanding: number | null;
  } | null;
}

type RowDef = {
  label: string;
  section: 'income' | 'balance' | 'ratios';
  key: string;
  format: 'currency' | 'percent' | 'ratio' | 'days';
  lowerIsBetter?: boolean;
};

const ROW_GROUPS: { title: string; rows: RowDef[] }[] = [
  {
    title: 'Resultados',
    rows: [
      { label: 'Ventas', section: 'income', key: 'revenue', format: 'currency' },
      { label: 'EBITDA', section: 'income', key: 'ebitda', format: 'currency' },
      { label: 'Resultado Neto', section: 'income', key: 'netIncome', format: 'currency' },
    ],
  },
  {
    title: 'Balance',
    rows: [
      { label: 'Total Activo', section: 'balance', key: 'totalAssets', format: 'currency' },
      { label: 'Patrimonio Neto', section: 'balance', key: 'equity', format: 'currency' },
    ],
  },
  {
    title: 'Liquidez',
    rows: [
      { label: 'Liquidez General', section: 'ratios', key: 'currentRatio', format: 'ratio' },
      { label: 'Acid Test', section: 'ratios', key: 'quickRatio', format: 'ratio' },
    ],
  },
  {
    title: 'Rentabilidad',
    rows: [
      { label: 'ROE', section: 'ratios', key: 'roe', format: 'percent' },
      { label: 'ROA', section: 'ratios', key: 'roa', format: 'percent' },
      { label: 'Margen Bruto', section: 'ratios', key: 'grossMargin', format: 'percent' },
      { label: 'Margen EBITDA', section: 'ratios', key: 'ebitdaMargin', format: 'percent' },
      { label: 'Margen Neto', section: 'ratios', key: 'netMargin', format: 'percent' },
    ],
  },
  {
    title: 'Endeudamiento',
    rows: [
      { label: 'Deuda / EBITDA', section: 'ratios', key: 'debtToEbitda', format: 'ratio', lowerIsBetter: true },
      { label: 'Deuda / Equity', section: 'ratios', key: 'debtToEquity', format: 'ratio', lowerIsBetter: true },
    ],
  },
  {
    title: 'Actividad',
    rows: [
      { label: 'Rotación Activos', section: 'ratios', key: 'assetTurnover', format: 'ratio' },
      { label: 'Plazo Cobro (días)', section: 'ratios', key: 'daysSalesOutstanding', format: 'days', lowerIsBetter: true },
      { label: 'Plazo Pago (días)', section: 'ratios', key: 'daysPayableOutstanding', format: 'days' },
    ],
  },
  {
    title: 'Riesgo',
    rows: [
      { label: 'Altman Z-Score', section: 'ratios', key: 'altmanZScore', format: 'ratio' },
    ],
  },
];

export const CompareCompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    companyService.getCompanies().then(setCompanies).catch(() => {});
  }, []);

  const toggleCompany = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/ratios/compare', {
        params: { companies: selectedIds.join(','), year },
      });
      setResults(res.data.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al comparar empresas');
    } finally {
      setLoading(false);
    }
  };

  const getValue = (result: CompareResult, row: RowDef): number | null => {
    const section = result[row.section] as any;
    if (!section) return null;
    return section[row.key] ?? null;
  };

  const formatVal = (val: number | null, format: string): React.ReactNode => {
    if (val == null) return <span className="text-slate-400">n/d</span>;
    switch (format) {
      case 'currency': return val.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
      case 'percent':  return val.toFixed(1) + '%';
      case 'ratio':    return val.toFixed(2);
      case 'days':     return val.toFixed(0) + ' d';
      default:         return val.toFixed(2);
    }
  };

  const getBestWorst = (row: RowDef): { best: number; worst: number } => {
    const vals = results.map(r => getValue(r, row));
    const nums = vals.map((v, i) => ({ v, i })).filter(x => x.v != null) as { v: number; i: number }[];
    if (nums.length < 2) return { best: -1, worst: -1 };
    const maxIdx = nums.reduce((a, b) => b.v > a.v ? b : a).i;
    const minIdx = nums.reduce((a, b) => b.v < a.v ? b : a).i;
    return row.lowerIsBetter
      ? { best: minIdx, worst: maxIdx }
      : { best: maxIdx, worst: minIdx };
  };

  const colCount = Math.max(results.length, 1);
  const gridCols = `14rem repeat(${colCount}, 1fr)`;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-900 rounded-xl">
            <ArrowLeftRight className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Comparación de Empresas</h1>
            <p className="text-sm text-slate-500">Compara hasta 3 empresas lado a lado en el mismo ejercicio</p>
          </div>
        </div>

        {/* Config panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <div className="flex flex-wrap gap-5 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ejercicio</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(parseInt(e.target.value))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono w-24 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Empresas <span className="text-slate-400 font-normal">(selecciona 2 ó 3)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {companies.length === 0 && (
                  <span className="text-sm text-slate-400">No hay empresas disponibles</span>
                )}
                {companies.map(c => {
                  const sel = selectedIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCompany(c.id)}
                      disabled={!sel && selectedIds.length >= 3}
                      className={[
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                        sel
                          ? 'bg-amber-500/10 border-amber-400 text-amber-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed',
                      ].join(' ')}
                    >
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[140px]">{c.name}</span>
                      {sel && (
                        <span className="ml-0.5 w-4 h-4 bg-amber-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                          {selectedIds.indexOf(c.id) + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleCompare}
              disabled={selectedIds.length < 2 || loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
              Comparar
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
        )}

        {results.length === 0 && !loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <ArrowLeftRight className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {selectedIds.length < 2
                ? 'Selecciona al menos 2 empresas y pulsa "Comparar"'
                : 'Pulsa "Comparar" para ver el análisis lado a lado'}
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            {/* Company header row */}
            <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: gridCols }}>
              <div className="px-5 py-4 bg-slate-50 border-r border-slate-100" />
              {results.map((r, i) => (
                <div key={i} className="px-5 py-4 border-l border-slate-100 first:border-l-0">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 mb-1.5">
                    #{i + 1}
                  </div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">{r.company.name}</p>
                  {r.company.industry && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{r.company.industry}</p>
                  )}
                  {!r.hasData && (
                    <p className="text-xs text-red-400 mt-1">Sin datos para {year}</p>
                  )}
                </div>
              ))}
            </div>

            {ROW_GROUPS.map((group, gi) => (
              <div key={gi}>
                {/* Group label */}
                <div className="px-5 py-2 bg-slate-100 border-b border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group.title}</span>
                </div>

                {group.rows.map((row, ri) => {
                  const { best, worst } = getBestWorst(row);
                  return (
                    <div
                      key={ri}
                      className="grid border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                      style={{ gridTemplateColumns: gridCols }}
                    >
                      <div className="px-5 py-3 text-sm text-slate-600 font-medium border-r border-slate-100">{row.label}</div>
                      {results.map((r, ci) => {
                        const val = getValue(r, row);
                        const isBest  = ci === best  && val != null;
                        const isWorst = ci === worst && val != null && best !== worst;
                        return (
                          <div
                            key={ci}
                            className={`px-5 py-3 border-l border-slate-100 first:border-l-0 text-right font-mono text-sm font-semibold ${
                              isBest ? 'text-emerald-600' : isWorst ? 'text-red-500' : 'text-slate-700'
                            }`}
                          >
                            {!r.hasData ? (
                              <span className="text-slate-300 font-normal">—</span>
                            ) : (
                              <>
                                {formatVal(val, row.format)}
                                {isBest  && <span className="ml-1 text-emerald-400 text-xs">▲</span>}
                                {isWorst && <span className="ml-1 text-red-400 text-xs">▼</span>}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Mejor valor
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                Peor valor
              </span>
              <span className="ml-auto text-slate-400">Ejercicio {year}</span>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
