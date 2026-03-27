import React from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { type CompanyAnalysisYear } from '../../services/ratios.service';

interface Props {
  years: CompanyAnalysisYear[];
}

const COLORS = {
  blue:   '#3b82f6',
  indigo: '#6366f1',
  sky:    '#0ea5e9',
  green:  '#10b981',
  teal:   '#14b8a6',
  amber:  '#f59e0b',
  orange: '#f97316',
  red:    '#ef4444',
  violet: '#8b5cf6',
  slate:  '#64748b',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt2 = (v: number | null | undefined) =>
  v != null ? v.toFixed(2) : 'n/d';

const fmtDays = (v: number | null | undefined) =>
  v != null ? `${v.toFixed(0)} días` : 'n/d';

// ── Chart card ────────────────────────────────────────────────────────────────

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accentColor?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  accentColor = 'border-amber-400',
}) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`}>
    <div className={`border-l-4 ${accentColor} px-5 py-4 bg-gray-50 border-b border-gray-100`}>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-5">
      {children}
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const AnalyticsSection: React.FC<Props> = ({ years }) => {
  // Ordenar de más antiguo a más reciente para que el eje X quede cronológico
  const sorted = [...years]
    .filter(y => y.ratios != null)
    .sort((a, b) => a.year - b.year);

  if (sorted.length < 2) {
    return (
      <div className="text-center py-16 text-gray-500 text-sm">
        Se necesitan al menos 2 ejercicios con ratios calculados para mostrar los gráficos.
      </div>
    );
  }

  // ── Datasets ────────────────────────────────────────────────────────────────

  const liquidezData = sorted.map(y => ({
    year: y.year,
    'Ratio Corriente': y.ratios?.currentRatio ?? null,
    'Prueba Ácida':    y.ratios?.quickRatio    ?? null,
    'Cash Ratio':      y.ratios?.cashRatio     ?? null,
  }));

  const endeudamientoData = sorted.map(y => ({
    year: y.year,
    'Deuda / Equity':       y.ratios?.debtToEquity  ?? null,
    'Deuda / Activo Total': y.ratios?.debtToAssets  ?? null,
    'Deuda / EBITDA':       y.ratios?.debtToEbitda  ?? null,
  }));

  const rotacionData = sorted.map(y => ({
    year: y.year,
    'Rotación de Activo': y.ratios?.assetTurnover ?? null,
  }));

  const diasData = sorted.map(y => ({
    year: y.year,
    'Días de Cobro': y.ratios?.daysSalesOutstanding  ?? null,
    'Días de Pago':  y.ratios?.daysPayableOutstanding ?? null,
  }));

  const rentabilidadData = sorted.map(y => ({
    year: y.year,
    'ROE': y.ratios?.roe ?? null,
    'ROA': y.ratios?.roa ?? null,
    'ROI': y.ratios?.roi ?? null,
  }));

  const margenData = sorted.map(y => ({
    year: y.year,
    'Margen Bruto':   y.ratios?.grossMargin  ?? null,
    'Margen EBITDA':  y.ratios?.ebitdaMargin ?? null,
    'Margen Neto':    y.ratios?.netMargin    ?? null,
  }));

  // ── Common axis/tooltip props ────────────────────────────────────────────────

  const xAxisProps = { dataKey: 'year', tick: { fontSize: 12 } } as const;
  const gridProps  = { strokeDasharray: '3 3', stroke: '#e5e7eb' } as const;

  return (
    <div className="space-y-8">

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Analítica · Evolución de Indicadores</h2>
        <p className="text-sm text-gray-500">Evolución histórica de los principales ratios financieros</p>
      </div>

      {/* ── LIQUIDEZ ─────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">
          Liquidez
        </h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard
            title="Evolución de Liquidez"
            subtitle="Ratio corriente, Prueba ácida y Cash ratio"
            accentColor="border-blue-500"
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={liquidezData}>
                <CartesianGrid {...gridProps} />
                <XAxis {...xAxisProps} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v.toFixed(1)} />
                <Tooltip formatter={(v: any) => fmt2(v)} />
                <Legend />
                <Line type="monotone" dataKey="Ratio Corriente" stroke={COLORS.blue}   strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="Prueba Ácida"    stroke={COLORS.indigo} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="Cash Ratio"      stroke={COLORS.sky}    strokeWidth={2} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 flex gap-4 text-xs text-gray-500 flex-wrap">
              <span><span className="font-semibold text-blue-600">Corriente &gt; 1.5</span> — buena cobertura CP</span>
              <span><span className="font-semibold text-indigo-600">Prueba Ácida &gt; 1.0</span> — sin contar existencias</span>
            </div>
          </ChartCard>

          {/* Placeholder que mantiene la grid equilibrada cuando solo hay 1 columna de liquidez */}
          <div className="hidden xl:block" />
        </div>
      </section>

      {/* ── ENDEUDAMIENTO Y SOLVENCIA ────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-orange-600 mb-3">
          Endeudamiento y Solvencia
        </h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard
            title="Endeudamiento y Solvencia"
            subtitle="Deuda / Equity · Deuda / Activo Total · Deuda / EBITDA"
            accentColor="border-orange-500"
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={endeudamientoData}>
                <CartesianGrid {...gridProps} />
                <XAxis {...xAxisProps} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v.toFixed(1)} />
                <Tooltip formatter={(v: any) => fmt2(v)} />
                <Legend />
                <Line type="monotone" dataKey="Deuda / Equity"       stroke={COLORS.orange} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="Deuda / Activo Total"  stroke={COLORS.amber}  strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="Deuda / EBITDA"        stroke={COLORS.red}    strokeWidth={2} dot={{ r: 4 }} connectNulls strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 flex gap-4 text-xs text-gray-500 flex-wrap">
              <span><span className="font-semibold text-orange-600">D/E &lt; 1.5</span></span>
              <span><span className="font-semibold text-amber-600">D/Activo &lt; 0.6</span></span>
              <span><span className="font-semibold text-red-600">D/EBITDA &lt; 3×</span></span>
            </div>
          </ChartCard>

          <div className="hidden xl:block" />
        </div>
      </section>

      {/* ── ACTIVIDAD / EFICIENCIA ───────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-teal-600 mb-3">
          Actividad y Eficiencia
        </h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Eficiencia 1 — Rotación de Activo */}
          <ChartCard
            title="Actividad Eficiencia 1 — Rotación de Activo"
            subtitle="Ventas generadas por cada unidad de activo total"
            accentColor="border-teal-500"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rotacionData} barSize={36}>
                <CartesianGrid {...gridProps} />
                <XAxis {...xAxisProps} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v.toFixed(2)} />
                <Tooltip formatter={(v: any) => [fmt2(v), 'Rotación']} />
                <Legend />
                <Bar dataKey="Rotación de Activo" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-3 text-xs text-gray-500">
              <span className="font-semibold text-teal-600">Óptimo &gt; 1.0×</span> — mayor valor indica mejor uso de activos para generar ventas.
            </p>
          </ChartCard>

          {/* Eficiencia 2 — Días de Cobro y Pago */}
          <ChartCard
            title="Actividad Eficiencia 2 — Días de Cobro y Pago"
            subtitle="Días Promedio de Cobro (DSO) vs. Días Promedio de Pago (DPO)"
            accentColor="border-violet-500"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={diasData} barSize={26}>
                <CartesianGrid {...gridProps} />
                <XAxis {...xAxisProps} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}d`} />
                <Tooltip formatter={(v: any) => fmtDays(v)} />
                <Legend />
                <Bar dataKey="Días de Cobro" fill={COLORS.violet} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Días de Pago"  fill={COLORS.slate}  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex gap-4 text-xs text-gray-500 flex-wrap">
              <span><span className="font-semibold text-violet-600">Cobro &lt; 60 días</span> — cuanto menor mejor</span>
              <span><span className="font-semibold text-slate-600">Pago 60–90 días</span> — mayor es favorable</span>
            </div>
          </ChartCard>

        </div>
      </section>

      {/* ── RENTABILIDAD ─────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">
          Rentabilidad
        </h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          <ChartCard
            title="Evolución ROE / ROA / ROI"
            subtitle="Rentabilidad financiera, económica y sobre inversión (%)"
            accentColor="border-green-500"
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={rentabilidadData}>
                <CartesianGrid {...gridProps} />
                <XAxis {...xAxisProps} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(v: any) => [`${fmt2(v)}%`]} />
                <Legend />
                <Line type="monotone" dataKey="ROE" stroke={COLORS.green} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="ROA" stroke={COLORS.teal}  strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="ROI" stroke={COLORS.blue}  strokeWidth={2} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Evolución de Márgenes"
            subtitle="Margen bruto, EBITDA y neto (%)"
            accentColor="border-amber-500"
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={margenData}>
                <CartesianGrid {...gridProps} />
                <XAxis {...xAxisProps} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(v: any) => [`${fmt2(v)}%`]} />
                <Legend />
                <Line type="monotone" dataKey="Margen Bruto"  stroke={COLORS.amber}  strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="Margen EBITDA" stroke={COLORS.orange} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="Margen Neto"   stroke={COLORS.red}    strokeWidth={2} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      </section>

    </div>
  );
};
