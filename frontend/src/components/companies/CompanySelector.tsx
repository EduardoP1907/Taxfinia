import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Button } from '../ui/Button';
import type { Company } from '../../types/company';

interface CompanySelectorProps {
  companies: Company[];
  onSelect: (company: Company) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  /** Nodo a renderizar antes del card (ej: tabs header en proyecciones) */
  tabsHeader?: React.ReactNode;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  companies,
  onSelect,
  title,
  description = 'Selecciona una empresa para continuar',
  icon,
  tabsHeader,
}) => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      {tabsHeader}
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 py-6 text-center">
            <div className="flex items-center justify-center w-14 h-14 mx-auto bg-amber-500 rounded-xl mb-4">
              {icon ?? <Building2 className="w-7 h-7 text-slate-900" />}
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
            <p className="text-slate-400 text-sm">{description}</p>
          </div>

          {/* Company list */}
          <div className="p-6">
            {companies.length === 0 ? (
              <div className="text-center py-10">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-4">No tienes empresas creadas aún</p>
                <Button onClick={() => navigate('/empresas')}>
                  Crear primera empresa
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => onSelect(company)}
                    className="w-full flex items-center justify-between px-4 py-3.5 border border-gray-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center flex-shrink-0 transition-colors">
                        <Building2 className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{company.name}</p>
                        <p className="text-xs text-gray-400">
                          {company.taxId ? company.taxId : 'Sin RUT'}
                          {company.industry ? ` · ${company.industry}` : ''}
                          {company.baseYear ? ` · Año base: ${company.baseYear}` : ''}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 flex-shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => navigate('/empresas')}>
                Gestionar empresas
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
                Volver al dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
