import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bot, ArrowLeftRight, Building2, Lock } from 'lucide-react';
import { useAccess } from '../../hooks/useAccess';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { CompanySelector } from '../../components/companies/CompanySelector';
import { CompanyChat } from '../../components/report/CompanyChat';
import { companyService } from '../../services/company.service';
import { useCompanyStore } from '../../store/companyStore';
import { useAuthStore } from '../../store/authStore';
import type { Company } from '../../types/company';

// ─── Asistente Financiero IA — pestaña dedicada ──────────────────────────────
// Antes vivía como panel plegable dentro de /informe. Usa la misma selección de
// empresa por URL (?companyId=) que el resto de páginas.

export const ChatPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const forgetCompany = useCompanyStore(s => s.forgetCompany);
  const userId = useAuthStore(s => s.user?.id);
  const { readOnly } = useAccess();

  useEffect(() => {
    companyService.getCompanies()
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoadingCompanies(false));
  }, []);

  const companyId = searchParams.get('companyId');
  const selectedCompany = companies.find(c => c.id === companyId) ?? null;

  const changeCompany = () => {
    if (userId) forgetCompany(userId);
    const p = new URLSearchParams(searchParams);
    p.delete('companyId');
    setSearchParams(p);
  };

  if (!companyId) {
    return (
      <CompanySelector
        companies={companies}
        loading={loadingCompanies}
        onSelect={company => {
          const p = new URLSearchParams(searchParams);
          p.set('companyId', company.id);
          setSearchParams(p);
        }}
        title="Asistente Financiero IA"
        description="Selecciona la empresa sobre la que quieres hacer consultas"
        icon={<Bot className="w-4 h-4 text-amber-400" aria-hidden="true" />}
      />
    );
  }

  const canChange = companies.length > 1;
  const companyName = selectedCompany?.name ?? (loadingCompanies ? 'Cargando…' : 'Empresa');

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 text-balance">Asistente Financiero IA</h1>
            <p className="text-sm text-slate-500">
              Pregunta sobre ratios, tendencias, riesgos y valoración. Las respuestas usan todos
              los datos anuales, proyecciones e informes de la empresa.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg max-w-[16rem]">
              <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{companyName}</span>
            </span>
            {canChange && <button
              type="button"
              onClick={changeCompany}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
              Cambiar empresa
            </button>}
          </div>
        </div>

        {/* Cuenta vencida: sin acceso al asistente (se le podrían dar datos de un
            ejercicio nuevo sin renovar la suscripción) */}
        {readOnly ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-slate-400" aria-hidden="true" />
            </div>
            <h2 className="text-base font-bold text-slate-800 mb-1">Asistente no disponible</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              El asistente IA requiere una suscripción vigente. Contacta al administrador para renovarla.
            </p>
          </div>
        ) : (
          /* key: the chat loads its history per company on mount */
          <CompanyChat
            key={companyId}
            companyId={companyId}
            companyName={companyName}
            isLocked={false}
            variant="page"
          />
        )}

        <p className="text-xs text-slate-400">
          ¿Buscas el informe redactado?{' '}
          <Link to={`/informe?companyId=${companyId}`} className="text-amber-700 hover:underline">
            Ir al Informe Anual
          </Link>
        </p>
      </div>
    </DashboardLayout>
  );
};
