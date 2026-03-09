import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  FileBarChart,
  TrendingUp,
  Flame,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, public: true },
    { name: 'Mis Empresas', href: '/empresas', icon: Building2, public: true },
    { name: 'Ingresar Datos', href: '/datos', icon: FileText, public: true },
    { name: 'Proyecciones', href: '/proyecciones', icon: TrendingUp, public: true },
    { name: 'Informe Final', href: '/informe', icon: FileBarChart, public: true },
    { name: 'Análisis Detallado', href: '/analisis', icon: FileBarChart, admin: true },
    { name: 'Configuración', href: '/configuracion', icon: Settings, public: true },
  ];

  const visibleNavigation = navigation.filter(
    (item) => item.public || (item.admin && isAdmin)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar móvil */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 shadow-2xl">
          <SidebarContent
            navigation={visibleNavigation}
            location={location}
            user={user}
            isAdmin={isAdmin}
            onLogout={handleLogout}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Sidebar desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent
          navigation={visibleNavigation}
          location={location}
          user={user}
          isAdmin={isAdmin}
          onLogout={handleLogout}
        />
      </div>

      {/* Contenido principal */}
      <div className="lg:pl-64">
        {/* Header móvil */}
        <div className="sticky top-0 z-40 lg:hidden bg-slate-900 border-b border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-white tracking-wider">PROMETHEIA</span>
            </div>
            <div className="w-6" />
          </div>
        </div>

        {/* Contenido */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

interface SidebarContentProps {
  navigation: any[];
  location: any;
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
  onClose?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  navigation,
  location,
  user,
  isAdmin,
  onLogout,
  onClose,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-slate-900" />
          </div>
          <span className="font-bold text-lg text-white tracking-wider">
            PROMETHEIA
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Usuario */}
      <div className="px-5 py-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-sm flex-shrink-0">
            {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName
                ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
                : user?.email}
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {isAdmin ? 'Administrador' : 'Analista'}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm
                ${isActive
                  ? 'bg-amber-500/10 text-amber-400 font-medium border-l-2 border-amber-500 pl-[10px]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 font-normal border-l-2 border-transparent pl-[10px]'
                }
              `}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout + versión */}
      <div className="px-3 py-4 border-t border-slate-700/60 space-y-1">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all duration-150 border-l-2 border-transparent pl-[10px]"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Cerrar Sesión</span>
        </button>
        <p className="text-xs text-slate-600 px-3 pt-1">v1.0 · Análisis Financiero</p>
      </div>
    </div>
  );
};
