import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCompanyStore } from '../store/companyStore';
import { useAccess, formatDateCL } from '../hooks/useAccess';
import { authService } from '../services/auth.service';
import {
  LayoutDashboard, FileText, LogOut, Menu, X,
  Building2, FileBarChart, TrendingUp, Flame, ChevronRight, Bot, ArrowLeftRight, Lock, Users, Link2,
  BookOpen, Download, PanelLeftClose, PanelLeftOpen, CalendarRange, Wallet, FileChartLine,
} from 'lucide-react';
import { MANUAL_PDF_URL, MANUAL_PDF_FILENAME } from '../pages/manual/manualContent';

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

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

  // Escritorio: el menú se puede plegar a solo íconos (se recuerda en este navegador)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => setCollapsed(prev => {
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, prev ? '0' : '1'); } catch { /* sin almacenamiento */ }
    return !prev;
  });

  const isAdmin = user?.role === 'ADMIN';

  // ── Empresa activa: el menú recuerda la última empresa usada ──────────────
  const {
    activeCompanyId, activeCompanyName, companies,
    initActiveCompany, rememberCompany, forgetCompany,
  } = useCompanyStore();

  useEffect(() => {
    if (user?.id && !isAdmin) initActiveCompany(user.id);
  }, [user?.id, isAdmin, initActiveCompany]);

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

  // Los años del menú se calculan cada vez: el informe anual es del último
  // ejercicio cerrado, la proyección del año en curso y el presupuesto del siguiente.
  const currentYear = new Date().getFullYear();

  // El admin tiene su propio menú: no ve las secciones de usuario
  const adminNavGroups: NavGroup[] = [
    {
      label: 'Cuentas',
      items: [{ name: 'Usuarios', href: '/admin/usuarios', icon: Users }],
    },
    {
      label: 'Empresas',
      items: [{ name: 'Empresas', href: '/admin/empresas', icon: Building2 }],
    },
    {
      label: 'Accesos de prueba',
      items: [{ name: 'Invitaciones', href: '/admin/invitaciones', icon: Link2 }],
    },
  ];

  const userNavGroups: NavGroup[] = [
    {
      label: 'Inicio',
      items: [
        { name: 'Panel Principal', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Mis Empresas',    href: '/empresas',  icon: Building2 },
      ],
    },
    {
      label: 'Análisis Financiero',
      items: [
        { name: 'Datos Financieros',                       href: '/datos',        icon: FileText,     scoped: true },
        { name: 'Proyecciones a 10 Años',                  href: '/proyecciones', icon: TrendingUp,   scoped: true },
        { name: `Informe Financiero Anual ${currentYear - 1}`, href: '/informe',  icon: FileBarChart, scoped: true },
      ],
    },
    {
      label: 'Proyecciones Mensuales',
      items: [
        { name: `Proyección Financiera ${currentYear}`,   href: '/forecast-mensual',      icon: CalendarRange,   scoped: true },
        { name: `Presupuesto Financiero ${currentYear + 1}`, href: '/budget',             icon: Wallet,   scoped: true },
        { name: 'Informes Proyectados',                   href: '/informes-comparativos', icon: FileChartLine, scoped: true },
      ],
    },
    {
      label: 'Inteligencia Artificial',
      items: [
        { name: 'Asistente IA', href: '/asistente', icon: Bot, scoped: true },
      ],
    },
    {
      label: 'Ayuda',
      items: [
        { name: 'Manual de Usuario',        href: '/manual',       icon: BookOpen },
        { name: 'Descargar manual (PDF)',   href: MANUAL_PDF_URL,  icon: Download, download: MANUAL_PDF_FILENAME },
      ],
    },
  ];

  const navGroups = isAdmin ? adminNavGroups : userNavGroups;
  const sidebarCompanyId = isAdmin ? null : activeCompanyId;

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
              activeCompanyId={sidebarCompanyId}
              activeCompanyName={activeCompanyName}
              canChangeCompany={(companies?.length ?? 0) > 1}
              onChangeCompany={handleChangeCompany}
            />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col overflow-hidden motion-safe:transition-[width] duration-200 ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}>
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          navGroups={navGroups}
          location={location}
          user={user}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          activeCompanyId={sidebarCompanyId}
          activeCompanyName={activeCompanyName}
          canChangeCompany={(companies?.length ?? 0) > 1}
          onChangeCompany={handleChangeCompany}
        />
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className={`motion-safe:transition-[padding] duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
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
          {readOnly && !isAdmin && (
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
// download: archivo estático que se descarga (no es una ruta de la app)
interface NavItem  { name: string; href: string; icon: React.ElementType; scoped?: boolean; download?: string }
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
  /** Solo escritorio: menú plegado a íconos y botón para plegar/desplegar */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  navGroups, location, user, isAdmin, onLogout, onClose,
  activeCompanyId, activeCompanyName, canChangeCompany, onChangeCompany,
  collapsed = false, onToggleCollapse,
}) => {
  const initials = (user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase();
  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.email;

  const toggleButton = onToggleCollapse && (
    <button
      type="button"
      onClick={onToggleCollapse}
      aria-label={collapsed ? 'Desplegar menú' : 'Plegar menú'}
      aria-expanded={!collapsed}
      title={collapsed ? 'Desplegar menú' : 'Plegar menú'}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 flex-shrink-0"
    >
      {collapsed
        ? <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
        : <PanelLeftClose className="w-4 h-4" aria-hidden="true" />}
    </button>
  );

  // Plegado: solo íconos; el nombre de cada opción queda como tooltip
  if (collapsed) {
    return (
      <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
        <div className="flex items-center justify-center h-16 border-b border-slate-800">
          {toggleButton}
        </div>

        <div className="flex justify-center py-3.5 border-b border-slate-800">
          <div
            title={`${displayName} · ${isAdmin ? 'Administrador' : 'Analista'}`}
            className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-xs"
          >
            {initials}
          </div>
        </div>

        {activeCompanyId && (
          <div className="flex justify-center py-3 border-b border-slate-800">
            {canChangeCompany ? (
              <button
                type="button"
                onClick={onChangeCompany}
                aria-label={`Empresa activa: ${activeCompanyName ?? ''}. Cambiar empresa`}
                title={`Empresa activa: ${activeCompanyName ?? ''} (cambiar)`}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-amber-400 hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <Building2 className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <span title={`Empresa activa: ${activeCompanyName ?? ''}`} className="w-9 h-9 flex items-center justify-center text-amber-400">
                <Building2 className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">Empresa activa: {activeCompanyName}</span>
              </span>
            )}
          </div>
        )}

        <nav aria-label="Navegación principal" className="flex-1 px-2 py-3 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-3 pt-3 border-t border-slate-800' : ''}>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = !item.download && (
                    location.pathname === item.href ||
                    (item.href !== '/dashboard' && location.pathname.startsWith(item.href + '/')));
                  const className = [
                    'group flex items-center justify-center w-full h-10 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                    active ? 'bg-amber-500/15 text-amber-400' : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800',
                  ].join(' ');
                  const content = (
                    <>
                      <item.icon aria-hidden="true" className="w-5 h-5" />
                      <span className="sr-only">{item.name}</span>
                    </>
                  );
                  return item.download ? (
                    <a key={item.name} href={item.href} download={item.download} title={item.name} className={className}>
                      {content}
                    </a>
                  ) : (
                    <Link
                      key={item.name}
                      to={item.scoped && activeCompanyId ? `${item.href}?companyId=${activeCompanyId}` : item.href}
                      title={item.name}
                      aria-current={active ? 'page' : undefined}
                      className={className}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar Sesión"
            className="flex items-center justify-center w-full h-10 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">

      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
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
        {toggleButton}
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
                if (item.download) {
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      download={item.download}
                      onClick={onClose}
                      className="group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 text-sm text-slate-400 hover:text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      <item.icon aria-hidden="true" className="w-[18px] h-[18px] flex-shrink-0 text-slate-300 group-hover:text-amber-400 transition-colors" />
                      <span>{item.name}</span>
                    </a>
                  );
                }
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
                      <item.icon aria-hidden="true" className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${active ? 'text-amber-400' : 'text-slate-300 group-hover:text-amber-400'}`} />
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
          className="group flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true" />
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
