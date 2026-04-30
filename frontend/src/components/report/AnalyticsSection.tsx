import React from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { CompanyAnalysisYear } from '../../services/ratios.service';

interface Props {
  years: CompanyAnalysisYear[];
  currency?: string;
}

const fmt = (v: number, currency = 'EUR') =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(v);

const AMBER  = '#f59e0b';
const BLUE   = '#3b82f6';
const GREEN  = '#22c55e';
const RED    = '#ef4444';
const PURPLE = '#a855f7';

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-slate-300 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="mb-0.5">
          {p.name}: <span className="font-semibold">{p.value != null ? (typeof p.value === 'number' ? p.value.toFixed(2) : p.value) : '-'}</span>
        </p>
      ))}
    </div>
  );
};

export const AnalyticsSection: React.FC<Props> = ({ years, currency = 'EUR' }) => {
  const sorted = [...years].sort((a, b) => a.year - b.year);

  // ── Income statement series ───────────────────────────────────────────────
  const incomeData = sorted.map((y) => {
    const is = y.incomeStatement;
    if (!is) return { year: String(y.year) };
    const revenue      = Number(is.revenue ?? 0);
    const costSales    = Number(is.costOfSales ?? 0) + Number(is.staffCostsSales ?? 0);
    const adminExp     = Number(is.adminExpenses ?? 0) + Number(is.staffCostsAdmin ?? 0);
    const grossMargin  = revenue - costSales;
    const ebitda       = grossMargin - adminExp;

    return {
      year:        String(y.year),
      Ventas:      revenue,
      'Margen Bruto': grossMargin,
      EBITDA:      ebitda,
      'Resultado Neto': revenue > 0 ? revenue * (y.ratios?.netMargin ?? 0) / 100 : 0,
    };
  });

  // ── Profitability ratios ──────────────────────────────────────────────────
  const profitData = sorted.map((y) => ({
    year:  String(y.year),
    ROE:   y.ratios?.roe   ?? null,
    ROA:   y.ratios?.roa   ?? null,
    ROI:   y.ratios?.roi   ?? null,
    ROS:   y.ratios?.ros   ?? null,
  }));

  // ── Margin ratios ─────────────────────────────────────────────────────────
  const marginData = sorted.map((y) => ({
    year:           String(y.year),
    'Mg. Bruto':    y.ratios?.grossMargin   ?? null,
    'Mg. EBITDA':   y.ratios?.ebitdaMargin  ?? null,
    'Mg. EBIT':     y.ratios?.ebitMargin    ?? null,
    'Mg. Neto':     y.ratios?.netMargin     ?? null,
  }));

  // ── Liquidity ratios ──────────────────────────────────────────────────────
  const liquidityData = sorted.map((y) => ({
    year:          String(y.year),
    Liquidez:      y.ratios?.currentRatio ?? null,
    'Acid Test':   y.ratios?.quickRatio   ?? null,
    'Caja':        y.ratios?.cashRatio    ?? null,
  }));

  // ── Risk scores ───────────────────────────────────────────────────────────
  const riskData = sorted.map((y) => ({
    year:      String(y.year),
    'Altman Z': y.ratios?.altmanZScore    ?? null,
    'Springate': y.ratios?.springateScore ?? null,
  }));

  // ── Debt ratios ───────────────────────────────────────────────────────────
  const debtData = sorted.map((y) => ({
    year:            String(y.year),
    'D/Equity':      y.ratios?.debtToEquity  ?? null,
    'D/Activos':     y.ratios?.debtToAssets  ?? null,
    'D/EBITDA':      y.ratios?.debtToEbitda  ?? null,
  }));

  const sectionClass = 'bg-white rounded-xl border border-slate-200 p-5';
  const titleClass   = 'text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2';
  const dot          = (c: string) => <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: c }} />;

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        No hay datos suficientes para mostrar gráficos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Income: Bar chart ─────────────────────────────────────────────── */}
      <div className={sectionClass}>
        <h3 className={titleClass}>{dot(AMBER)} Evolución de Resultados</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={incomeData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => fmt(v, currency)} width={72} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Ventas"           fill={BLUE}   radius={[3,3,0,0]} maxBarSize={40} />
            <Bar dataKey="Margen Bruto"     fill={AMBER}  radius={[3,3,0,0]} maxBarSize={40} />
            <Bar dataKey="EBITDA"           fill={GREEN}  radius={[3,3,0,0]} maxBarSize={40} />
            <Bar dataKey="Resultado Neto"   fill={PURPLE} radius={[3,3,0,0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── 2-column: Rentabilidad + Márgenes ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={sectionClass}>
          <h3 className={titleClass}>{dot(GREEN)} Ratios de Rentabilidad (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={profitData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Line type="monotone" dataKey="ROE" stroke={AMBER}  strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="ROA" stroke={BLUE}   strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="ROI" stroke={GREEN}  strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="ROS" stroke={PURPLE} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={sectionClass}>
          <h3 className={titleClass}>{dot(AMBER)} Márgenes (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={marginData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Line type="monotone" dataKey="Mg. Bruto"  stroke={BLUE}   strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Mg. EBITDA" stroke={GREEN}  strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Mg. EBIT"   stroke={AMBER}  strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Mg. Neto"   stroke={PURPLE} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 2-column: Liquidez + Endeudamiento ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={sectionClass}>
          <h3 className={titleClass}>{dot(BLUE)} Ratios de Liquidez</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={liquidityData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'mín', fill: '#ef4444', fontSize: 10 }} />
              <Line type="monotone" dataKey="Liquidez"  stroke={BLUE}  strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Acid Test" stroke={AMBER} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Caja"      stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={sectionClass}>
          <h3 className={titleClass}>{dot(RED)} Endeudamiento</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={debtData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="D/Equity"  stroke={RED}    strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="D/Activos" stroke={AMBER}  strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="D/EBITDA"  stroke={PURPLE} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Risk scores ───────────────────────────────────────────────────── */}
      <div className={sectionClass}>
        <h3 className={titleClass}>{dot(RED)} Modelos de Predicción de Insolvencia</h3>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3">
          <span>Altman Z &gt; 2.9 = Zona segura</span>
          <span className="text-slate-300">|</span>
          <span>1.23–2.9 = Zona gris</span>
          <span className="text-slate-300">|</span>
          <span className="text-red-500">Z &lt; 1.23 = Peligro</span>
          <span className="text-slate-300 ml-4">|</span>
          <span>Springate S &gt; 0.862 = Sana</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={riskData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={2.9}  stroke={GREEN} strokeDasharray="4 2" label={{ value: '2.9',   fill: GREEN, fontSize: 10, position: 'right' }} />
            <ReferenceLine y={1.23} stroke={RED}   strokeDasharray="4 2" label={{ value: '1.23',  fill: RED,   fontSize: 10, position: 'right' }} />
            <ReferenceLine y={0.862} stroke={AMBER} strokeDasharray="4 2" label={{ value: '0.862', fill: AMBER, fontSize: 10, position: 'right' }} />
            <Line type="monotone" dataKey="Altman Z"  stroke={RED}   strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="Springate" stroke={PURPLE} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
