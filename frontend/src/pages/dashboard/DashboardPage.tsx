import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Building2, FileText, FileBarChart, TrendingUp, ArrowRight, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  const quickActions = [
    {
      title: 'Mis Empresas',
      description: 'Gestiona las empresas que analizas',
      icon: Building2,
      href: '/empresas',
      color: 'bg-slate-800',
      iconColor: 'text-amber-400',
    },
    {
      title: 'Ingresar Datos',
      description: 'Añade información financiera',
      icon: FileText,
      href: '/datos',
      color: 'bg-slate-800',
      iconColor: 'text-amber-400',
    },
    {
      title: 'Ver Informe',
      description: 'Consulta el análisis completo',
      icon: FileBarChart,
      href: '/informe',
      color: 'bg-slate-800',
      iconColor: 'text-amber-400',
    },
  ];

  const recentStats = [
    { label: 'Empresas Activas', value: '0', icon: Building2 },
    { label: 'Informes Generados', value: '0', icon: FileBarChart },
    { label: 'Análisis Completados', value: '0', icon: TrendingUp },
  ];

  const steps = [
    { n: '1', text: 'Crea o selecciona una empresa en "Mis Empresas"' },
    { n: '2', text: 'Ingresa los datos financieros en "Ingresar Datos"' },
    { n: '3', text: 'El sistema calculará automáticamente los ratios financieros' },
    { n: '4', text: 'Visualiza el informe completo en "Ver Informe"' },
    { n: '5', text: 'Descarga el análisis en PDF o Word' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Bienvenido, {user?.firstName || 'Analista'}
          </h1>
          <p className="text-slate-500 text-sm">
            PROMETHEIA · Plataforma de Análisis y Valoración Financiera
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {recentStats.map((stat, index) => (
            <Card key={index}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className="w-11 h-11 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-slate-700 mb-4 uppercase tracking-wide">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.href}>
                <Card className="hover:shadow-md transition-all duration-200 cursor-pointer h-full hover:border-amber-200 group">
                  <div className="flex flex-col h-full">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500 transition-colors duration-200">
                      <action.icon className="w-5 h-5 text-amber-400 group-hover:text-slate-900 transition-colors duration-200" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                      {action.title}
                    </h3>
                    <p className="text-slate-500 text-sm mb-4 flex-grow">
                      {action.description}
                    </p>
                    <div className="flex items-center text-amber-600 font-medium text-sm">
                      Ir ahora
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-150" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-3">
                ¿Cómo usar PROMETHEIA?
              </h3>
              <ol className="space-y-2">
                {steps.map((step) => (
                  <li key={step.n} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="w-5 h-5 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {step.n}
                    </span>
                    {step.text}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};
