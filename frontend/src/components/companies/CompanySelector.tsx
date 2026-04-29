import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, Plus } from 'lucide-react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Button } from '../ui/Button';
import type { Company } from '../../types/company';

interface CompanySelectorProps {
  companies: Company[];
  onSelect: (company: Company) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  tabsHeader?: React.ReactNode;
  loading?: boolean;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  companies,
  onSelect,
  title,
  description = 'Selecciona una empresa para continuar',
  icon,
  tabsHeader,
  loading = false,
}) => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      {tabsHeader}
      <div className="max-w-2xl mx-auto mt-10 px-4">

        {/* Header */}
        <div className="mb-6">
          <p className="font-data text-[10px] text-slate-400 tracking-[0.2em] uppercase mb-1">/ Selección</p>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{description}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Card header accent */}
          <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300" />

          {/* Section label */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
              {icon ?? <Building2 className="w-4 h-4 text-amber-400" />}
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {companies.length > 0
                ? `${companies.length} empresa${companies.length !== 1 ? 's' : ''} disponible${companies.length !== 1 ? 's' : ''}`
                : 'Sin empresas'}
            </span>
          </div>

          {/* Company list */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Sin empresas todavía</h3>
                <p className="text-slate-500 text-sm mb-5 max-w-xs mx-auto">
                  Crea tu primera empresa para comenzar el análisis financiero
                </p>
                <Button onClick={() => navigate('/empresas')}>
                  <Plus className="w-4 h-4" />
                  Crear primera empresa
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => onSelect(company)}
                    className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-lg hover:border-amber-300 hover:bg-amber-50/50 transition-all text-left group focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center flex-shrink-0 transition-colors">
                        <Building2 className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{company.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {[
                            company.taxId,
                            company.industry,
                            company.baseYear ? `Año base: ${company.baseYear}` : null,
                          ].filter(Boolean).join(' · ') || 'Sin información adicional'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 flex-shrink-0 transition-colors ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 pt-1 flex justify-between items-center border-t border-slate-100 mt-1">
            <Button variant="outline" size="sm" onClick={() => navigate('/empresas')}>
              Gestionar empresas
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Volver al inicio
            </Button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};
