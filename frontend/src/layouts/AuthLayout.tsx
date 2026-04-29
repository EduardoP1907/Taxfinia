import React from 'react';
import { Flame } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  /** Override the middle section of the left panel */
  panelBody?: React.ReactNode;
}

const DEFAULT_FEATURES = [
  'Análisis económico-financiero profesional',
  'Valoración por múltiples metodologías',
  'Proyecciones y modelos DCF avanzados',
  'Informes ejecutivos generados con IA',
];

const DecorativeMetrics: React.FC = () => (
  <div className="grid grid-cols-2 gap-2.5 mt-8">
    {[
      { label: 'ROE', value: '18.4%', sub: '+2.1 pp' },
      { label: 'EBITDA Mg.', value: '24.7%', sub: 'vs sector' },
      { label: 'Liquidez', value: '2.84×', sub: 'zona segura' },
      { label: 'Altman Z', value: '3.71', sub: 'SAFE ZONE' },
    ].map((m) => (
      <div
        key={m.label}
        className="bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-2.5"
      >
        <p className="font-data text-[9px] text-slate-500 uppercase tracking-[0.15em] mb-1">{m.label}</p>
        <p className="font-data text-base font-semibold text-white tabular-nums">{m.value}</p>
        <p className="font-data text-[9px] text-amber-400/60 mt-0.5">{m.sub}</p>
      </div>
    ))}
  </div>
);

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, panelBody }) => (
  <div className="min-h-screen bg-slate-950 flex">
    {/* ── Left panel ──────────────────────────────────────────────────────── */}
    <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden bg-slate-900 border-r border-slate-800">
      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right,#f59e0b 1px,transparent 1px),linear-gradient(to bottom,#f59e0b 1px,transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      {/* Radial fade */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-900/40" />
      {/* Bottom amber line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      {/* Logo */}
      <div className="relative flex items-center gap-3">
        <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Flame className="w-5 h-5 text-slate-900" />
        </div>
        <span className="font-bold text-xl text-white tracking-wider">PROMETHEIA</span>
      </div>

      {/* Middle body */}
      <div className="relative">
        {panelBody ?? (
          <>
            <blockquote className="text-slate-300 text-xl font-light leading-relaxed mb-8 text-pretty">
              "El conocimiento financiero es la antorcha que ilumina el camino de las mejores decisiones."
            </blockquote>
            <div className="space-y-3">
              {DEFAULT_FEATURES.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                  <span className="text-slate-400 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <DecorativeMetrics />
          </>
        )}
      </div>

      {/* Footer */}
      <p className="relative text-slate-700 text-xs tracking-wide">
        © {new Date().getFullYear()} PROMETHEIA · Todos los derechos reservados
      </p>
    </div>

    {/* ── Right panel (form slot) ──────────────────────────────────────────── */}
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
      {/* Mobile logo */}
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
            <Flame className="w-5 h-5 text-slate-900" />
          </div>
          <span className="font-bold text-xl text-white tracking-wider">PROMETHEIA</span>
        </div>
        {children}
      </div>
    </div>
  </div>
);
