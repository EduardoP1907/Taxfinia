import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCompanyStore } from '../store/companyStore';
import { useAccess, formatDateCL } from '../hooks/useAccess';
import { authService } from '../services/auth.service';
import {
  LayoutDashboard, FileText, LogOut, Menu, X,
  Building2, FileBarChart, TrendingUp, Flame, ShieldCheck, ChevronRight, Bot, ArrowLeftRight, Lock,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout, refreshUser } = useAuthStore();
  const { readOnly, endsAt } = useAccess();

  // Vigencia/exención pueden cambiar (renovación del admin): refrescar al entrar
  useEffect(() => { refreshUser(); }, [refreshUser]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  // ── Empresa activa: el menú recuerda la última empresa usada ──────────────
  const {
    activeCompanyId, activeCompanyName, companies,
    initActiveCompany, rememberCompany, forgetCompany,
  } = useCompanyStore();

  useEffect(() => {
    if (user?.id) initActiveCompany(user.id);
  }, [user?.id, initActiveCompany]);

  // Cualquier página abierta con ?companyId= pasa a ser la empresa activa
  const urlCompanyId = new URLSearchParams(location.search).get('companyId');
  useEffect(() => {
    if (user?.id && urlCompanyId) rememberCompany(user.id, urlCompanyId);
  }, [user?.id, urlCompanyId, rememberCompany]);

  // "Cambiar empresa": olvida la activa y, si la página actual depende de una
  // empresa, la reabre sin ?companyId= para que muestre el selector.
  const handleChangeCompany = () => {
    if (!user?.id) return;
    forgetCompany(user.id);
    const scopedPage = navGroups.some(g => g.items.some(i => i.scoped && i.href === location.pathname));
    navigate(scopedPage ? location.pathname : '/empresas');
  };

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigate('/login');
  };

  const navGroups: NavGroup[] = [
    {
      label: null,
      items: [
        { name: 'Dashboard',    href: '/dashboard', icon: LayoutDashboard },
        { name: 'Mis Empresas', href: '/empresas',  icon: Building2 },
      ],
    },
    {
      label: 'Análisis Anual',
      items: [
        { name: 'Datos Anuales',  href: '/datos',        icon: FileText,     scoped: true },
        { name: 'Proyecciones',   href: '/proyecciones', icon: TrendingUp,   scoped: true },
        { name: 'Informe Anual',  href: '/informe',      icon: FileBarChart, scoped: true },
      ],
    },
    {
      label: 'Análisis Mensual',
      items: [
        { name: `Forecast ${new Date().getFullYear()}`, href: '/forecast-mensual',    icon: TrendingUp, scoped: true },
        { name: `Budget ${new Date().getFullYear() + 1}`, href: '/budget',    icon: TrendingUp, scoped: true },
        { name: 'Informe Forecast y Budget', href: '/informes-comparativos', icon: FileBarChart, scoped: true },
      ],
    },
    {
      label: 'Inteligencia Artificial',
      items: [
        { name: 'Asistente Financiero', href: '/asistente', icon: Bot, scoped: true },
      ],
    },
    ...(isAdmin ? [{
      label: 'Administración',
      items: [{ name: 'Admin', href: '/admin', icon: ShieldCheck }],
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Mobile overlay ─────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64">
            <Sidebar
              navGroups={navGroups}
              location={location}
              user={user}
              isAdmin={isAdmin}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
              activeCompanyId={activeCompanyId}
              activeCompanyName={activeCompanyName}
              canChangeCompany={(companies?.length ?? 0) > 1}
              onChangeCompany={handleChangeCompany}
            />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar
          navGroups={navGroups}
          location={location}
          user={user}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          activeCompanyId={activeCompanyId}
          activeCompanyName={activeCompanyName}
          canChangeCompany={(companies?.length ?? 0) > 1}
          onChangeCompany={handleChangeCompany}
        />
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-slate-900" />
              </div>
              <span className="font-display font-bold text-white tracking-wider text-sm">PROMETHEIA</span>
            </div>
            <div className="w-8" />
          </div>
        </div>

        <main className="py-8 px-4 sm:px-6 lg:px-8">
          {readOnly && (
            <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold">
                  Tu suscripción venció{endsAt ? ` el ${formatDateCL(endsAt)}` : ''}: la cuenta está en modo solo lectura.
                </p>
                <p className="mt-0.5">
                  Puedes ver y descargar tus informes, pero no cargar datos, generar informes nuevos ni usar el asistente IA.
                  Contacta al administrador para renovarla.
                </p>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

// ── Sidebar ──────────────────────────────────────────────────────────────────
// scoped: la página trabaja sobre una empresa → el enlace lleva la empresa activa
interface NavItem  { name: string; href: string; icon: React.ElementType; scoped?: boolean }
interface NavGroup { label: string | null; items: NavItem[] }
interface SidebarProps {
  navGroups: NavGroup[];
  location: any;
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
  onClose?: () => void;
  activeCompanyId: string | null;
  activeCompanyName: string | null;
  canChangeCompany: boolean;
  onChangeCompany: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  navGroups, location, user, isAdmin, onLogout, onClose,
  activeCompanyId, activeCompanyName, canChangeCompany, onChangeCompany,
}) => {
  const initials = (user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase();
  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.email;

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">

      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Flame className="w-4 h-4 text-slate-900" />
          </div>
          <span className="font-display font-bold text-white tracking-wider text-base">PROMETHEIA</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Cerrar menú" className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors lg:hidden">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* User */}
      <div className="px-4 py-3.5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-xs flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{displayName}</p>
            <p className="text-[11px] font-data text-slate-500 mt-0.5">
              {isAdmin ? 'ADMINISTRADOR' : 'ANALISTA'}
            </p>
          </div>
        </div>
      </div>

      {/* Empresa activa */}
      {activeCompanyId && (
        <div className="px-4 py-3 border-b border-slate-800">
          <p className="font-data text-[10px] font-semibold text-amber-500/80 tracking-[0.15em] uppercase mb-1.5">
            Empresa activa
          </p>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
            <p className="flex-1 min-w-0 text-sm text-white truncate" title={activeCompanyName ?? undefined}>
              {activeCompanyName ?? 'Cargando…'}
            </p>
            {canChangeCompany && (
              <button
                type="button"
                onClick={() => { onClose?.(); onChangeCompany(); }}
                aria-label="Cambiar empresa activa"
                title="Cambiar empresa"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 flex-shrink-0"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav aria-label="Navegación principal" className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-1.5 font-data text-[10px] font-semibold text-amber-500/80 tracking-[0.15em] uppercase">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  location.pathname === item.href ||
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href + '/')) ||
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href + '?'));
                return (
                  <Link
                    key={item.name}
                    to={item.scoped && activeCompanyId ? `${item.href}?companyId=${activeCompanyId}` : item.href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'group flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-150 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                      active
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon aria-hidden="true" className={`w-4 h-4 flex-shrink-0 ${active ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span className={active ? 'font-medium' : ''}>{item.name}</span>
                    </div>
                    {active && <ChevronRight className="w-3 h-3 text-amber-500/60" aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-slate-800 space-y-0.5">
        <button
          type="button"
          onClick={onLogout}
          className="group flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>Cerrar Sesión</span>
        </button>
        <div className="px-3 pt-2 flex items-center justify-between">
          <span className="font-data text-[10px] text-slate-700">v1.0</span>
          <span className="font-data text-[10px] text-slate-700">Análisis Financiero</span>
        </div>
      </div>
    </div>
  );
};
