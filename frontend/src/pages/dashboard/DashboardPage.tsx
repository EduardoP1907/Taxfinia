import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import {
  Building2, FileText, FileBarChart, TrendingUp,
  ArrowRight, Layers, Activity, Bot, CalendarCheck,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCompanyStore } from '../../store/companyStore';
import { useAccess, formatDateCL } from '../../hooks/useAccess';
import { companyService } from '../../services/company.service';

// Reloj aislado: solo este componente se vuelve a dibujar (antes era toda la página cada segundo)
const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  const hh = time.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const dd = time.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="sm:text-right flex-shrink-0">
      <p className="font-data text-2xl text-amber-400 tracking-wider tabular-nums">
        <time dateTime={time.toISOString()}>{hh}</time>
      </p>
      <p className="text-slate-500 text-xs mt-1 capitalize">{dd}</p>
    </div>
  );
};

// ── Decorative spark line (simulated chart) ──────────────────────────────────
const SparkLine: React.FC<{ points?: string; color?: string }> = ({
  points = '0,22 12,16 22,19 34,8 44,13 54,6 64,10 78,3',
  color = '#f59e0b',
}) => (
  <svg width="80" height="28" viewBox="0 0 80 28" fill="none" aria-hidden>
    <polyline
      points={points}
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.35"
    />
    <circle cx="78" cy="3" r="2" fill={color} opacity="0.6" />
  </svg>
);

// ── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  sparkPoints?: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, sparkPoints }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-200 hover:shadow-md transition duration-200 group">
    <div className="flex items-start justify-between mb-3">
      <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center group-hover:bg-amber-50 group-hover:border-amber-100 transition-colors duration-200">
        <Icon className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors duration-200" />
      </div>
      <SparkLine points={sparkPoints} />
    </div>
    <p className="font-data text-4xl font-medium text-slate-900 mb-1 tracking-tight tabular-nums">{value}</p>
    <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
  </div>
);

// ── Action card ──────────────────────────────────────────────────────────────
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  tag: string;
}
const ActionCard: React.FC<ActionCardProps> = ({ title, description, icon: Icon, href, tag }) => (
  <Link to={href} className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
    <div className="relative overflow-hidden bg-slate-900 rounded-xl p-6 h-full border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800 transition duration-200">
      <span className="inline-block font-data text-[10px] tracking-widest text-amber-500/60 bg-amber-500/8 border border-amber-500/15 rounded px-2 py-0.5 mb-5">
        {tag}
      </span>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center group-hover:bg-amber-500 transition-colors duration-200 flex-shrink-0">
          <Icon className="w-4 h-4 text-amber-400 group-hover:text-slate-900 transition-colors duration-200" />
        </div>
        <h3 className="text-base font-semibold text-white leading-tight">{title}</h3>
      </div>

      <p className="text-slate-400 text-sm leading-relaxed mb-5">{description}</p>

      <div className="flex items-center gap-1.5 font-data text-xs text-amber-400 tracking-wider">
        <span>ACCEDER</span>
        <ArrowRight className="w-3 h-3 motion-safe:group-hover:translate-x-1 transition-transform duration-150" aria-hidden="true" />
      </div>

      {/* Decorative corner icon */}
      <div className="absolute -bottom-2 -right-2 w-16 h-16 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-200" aria-hidden="true">
        <Icon className="w-full h-full text-amber-400" />
      </div>
    </div>
  </Link>
);

// ── Main page ────────────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { privileged, readOnly, endsAt } = useAccess();
  const activeCompanyId = useCompanyStore(s => s.activeCompanyId);
  const [stats, setStats] = useState<{ companyCount: number; reportCount: number; analysisCount: number } | null>(null);
  // Estado real de la conexión (antes era un texto fijo "API CONECTADA")
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    companyService.getDashboardStats()
      .then(s => { setStats(s); setApiStatus('ok'); })
      .catch(() => setApiStatus('error'));
  }, []);

  // Los accesos llevan la empresa activa para no pedir la selección otra vez
  const withCompany = (href: string) => (activeCompanyId ? `${href}?companyId=${activeCompanyId}` : href);

  const quickActions: ActionCardProps[] = [
    {
      title: 'Mis Empresas',
      description: 'Gestiona las empresas que analizas',
      icon: Building2,
      href: '/empresas',
      tag: 'PORTFOLIO',
    },
    {
      title: 'Ingresar Datos',
      description: 'Añade información financiera',
      icon: FileText,
      href: withCompany('/datos'),
      tag: 'INPUT',
    },
    {
      title: 'Ver Informe',
      description: 'Consulta el análisis completo',
      icon: FileBarChart,
      href: withCompany('/informe'),
      tag: 'OUTPUT',
    },
    {
      title: 'Asistente IA',
      description: 'Pregunta sobre ratios, riesgos y valoración',
      icon: Bot,
      href: withCompany('/asistente'),
      tag: 'CONSULTAS',
    },
  ];

  const recentStats: (StatCardProps & { key: string })[] = [
    {
      key: 'empresas',
      label: 'Empresas Activas',
      value: stats ? String(stats.companyCount) : '—',
      icon: Building2,
      sparkPoints: '0,22 14,18 26,20 38,12 50,15 62,9 74,11 80,7',
    },
    {
      key: 'informes',
      label: 'Informes Generados',
      value: stats ? String(stats.reportCount) : '—',
      icon: FileBarChart,
      sparkPoints: '0,20 10,17 22,21 36,14 48,16 60,10 70,13 80,6',
    },
    {
      key: 'analisis',
      label: 'Años con Ratios',
      value: stats ? String(stats.analysisCount) : '—',
      icon: TrendingUp,
      sparkPoints: '0,24 12,19 24,22 36,13 46,17 58,8 68,12 80,4',
    },
  ];

  const steps = [
    { n: '01', short: 'Empresa',   text: 'Crea o selecciona una empresa en «Mis Empresas»' },
    { n: '02', short: 'Datos',     text: 'Ingresa los estados financieros en «Datos Anuales»' },
    { n: '03', short: 'Cálculo',   text: 'El sistema calcula automáticamente los ratios financieros' },
    { n: '04', short: 'Informe',   text: 'Genera, revisa y descarga el informe en «Informe Anual»' },
    { n: '05', short: 'Consultar', text: 'Resuelve dudas sobre la empresa en «Asistente Financiero»' },
  ];


  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-8 py-10">
          {/* Grid texture */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(to right,#f59e0b 1px,transparent 1px),linear-gradient(to bottom,#f59e0b 1px,transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {/* Radial fade */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent" />
          {/* Bottom glow line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 motion-safe:animate-pulse" aria-hidden="true" />
                <span className="font-data text-amber-400 text-[10px] tracking-[0.2em] uppercase">
                  {readOnly ? 'Modo solo lectura' : 'Cuenta activa'}
                </span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white mb-2 leading-[1.1]">
                Bienvenido,{' '}
                <span className="text-amber-400">{user?.firstName || 'Analista'}</span>
              </h1>
              <p className="text-slate-400 text-sm mt-3">
                PROMETHEIA · Plataforma de Análisis y Valoración Financiera
              </p>
            </div>

            <Clock />
          </div>
        </div>

        {/* ── STATS ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentStats.map((s) => (
            <StatCard key={s.key} label={s.label} value={s.value} icon={s.icon} sparkPoints={s.sparkPoints} />
          ))}
        </div>

        {/* ── QUICK ACTIONS ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="font-data text-[10px] text-slate-400 tracking-[0.2em] uppercase">
              / Acciones rápidas
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((a) => (
              <ActionCard key={a.href} {...a} />
            ))}
          </div>
        </div>

        {/* ── MONTHLY ACTIONS ───────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="font-data text-[10px] text-slate-400 tracking-[0.2em] uppercase">
              / Análisis mensual
            </span>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="font-data text-[10px] text-amber-500/70 bg-amber-500/8 border border-amber-500/15 rounded px-2 py-0.5">
              Ene – Dic
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard
              title={`Forecast ${new Date().getFullYear()}`}
              description="Proyecta y edita el desglose mensual (enero a diciembre) a partir de los datos anuales"
              icon={TrendingUp}
              href={withCompany('/forecast-mensual')}
              tag="INPUT MENSUAL"
            />
            <ActionCard
              title={`Budget ${new Date().getFullYear() + 1}`}
              description="Presupuesta el desglose mensual del próximo ejercicio (P&G y balance proyectado)"
              icon={TrendingUp}
              href={withCompany('/budget')}
              tag="PRESUPUESTO"
            />
          </div>
        </div>

        {/* ── WORKFLOW ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Flujo de Trabajo</h3>
            <span className="font-data text-[10px] text-slate-400 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 ml-auto">
              5 PASOS
            </span>
          </div>

          {/* Desktop timeline */}
          <div className="hidden md:flex items-start">
            {steps.map((step, i) => (
              <React.Fragment key={step.n}>
                <div className="flex flex-col items-center flex-shrink-0 group cursor-default">
                  <div className="w-9 h-9 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center mb-3 group-hover:border-amber-400 group-hover:bg-amber-50 transition duration-200">
                    <span className="font-data text-[10px] font-medium text-slate-400 group-hover:text-amber-600 transition-colors">
                      {step.n}
                    </span>
                  </div>
                  <p className="font-semibold text-xs text-slate-700 text-center mb-1.5 whitespace-nowrap">
                    {step.short}
                  </p>
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed max-w-[110px] hidden lg:block">
                    {step.text}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-px bg-slate-200 mt-4 mx-1" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile list */}
          <ol className="md:hidden space-y-3">
            {steps.map((step, i) => (
              <li key={step.n} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-data text-[10px] font-medium flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-600 pt-0.5">{step.text}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* ── STATUS BAR ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 bg-slate-900/4 border border-slate-200 rounded-lg" role="status">
          <div className="flex items-center gap-2">
            <Activity
              className={`w-3.5 h-3.5 ${apiStatus === 'ok' ? 'text-green-500' : apiStatus === 'error' ? 'text-red-500' : 'text-slate-400'}`}
              aria-hidden="true"
            />
            <span className="font-data text-[10px] text-slate-500 tracking-wide">
              {apiStatus === 'ok' ? 'SERVIDOR CONECTADO' : apiStatus === 'error' ? 'SIN CONEXIÓN CON EL SERVIDOR' : 'VERIFICANDO CONEXIÓN…'}
            </span>
          </div>
          <div className="h-3 w-px bg-slate-200" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <CalendarCheck className={`w-3.5 h-3.5 ${readOnly ? 'text-red-500' : 'text-amber-500'}`} aria-hidden="true" />
            <span className="font-data text-[10px] text-slate-500 tracking-wide">
              {privileged
                ? 'SUSCRIPCIÓN SIN VENCIMIENTO'
                : readOnly
                  ? `SUSCRIPCIÓN VENCIDA${endsAt ? ` EL ${formatDateCL(endsAt)}` : ''}`
                  : endsAt
                    ? `SUSCRIPCIÓN VIGENTE HASTA ${formatDateCL(endsAt)}`
                    : 'SUSCRIPCIÓN VIGENTE'}
            </span>
          </div>
          <span className="font-data text-[10px] text-slate-400 ml-auto tracking-wide">v1.0</span>
        </div>

      </div>
    </DashboardLayout>
  );
};
