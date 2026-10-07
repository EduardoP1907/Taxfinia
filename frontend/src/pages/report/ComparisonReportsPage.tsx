/**
 * ComparisonReportsPage (ruta: /informes-comparativos)
 *
 * Dos informes IA comparativos, con el mismo contenido narrativo (13 secciones)
 * que el Informe Anual Prometheia, pero comparando periodos:
 *  - Forecast del año en curso vs. los 3 años anuales reales anteriores
 *  - Budget del año siguiente vs. Forecast del año en curso y los 2 años anuales reales anteriores
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { CompanySelector } from '../../components/companies/CompanySelector';
import { companyService } from '../../services/company.service';
import type { Company } from '../../types/company';
import { ComparisonAIReportPanel } from '../../components/report/ComparisonAIReportPanel';
import { BarChart3 } from 'lucide-react';

export const ComparisonReportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    companyService.getCompanies()
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoadingCompanies(false));
  }, []);

  const companyId = searchParams.get('companyId');
  const selectedCompany = companies.find(c => c.id === companyId) ?? null;

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
        title="Informe Forecast y Budget"
        description="Selecciona la empresa para generar sus informes comparativos Forecast/Budget vs. años reales"
        icon={<BarChart3 className="w-7 h-7 text-slate-900" />}
      />
    );
  }

  const companyName = selectedCompany?.name ?? companyId;
  const forecastYear = new Date().getFullYear();
  const budgetYear = forecastYear + 1;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Informe Forecast y Budget</h1>
          <p className="text-sm text-slate-500 mt-1">{companyName}</p>
        </div>

        <ComparisonAIReportPanel
          companyId={companyId}
          companyName={companyName}
          type="FORECAST_VS_ANNUAL"
          title={`Forecast ${forecastYear} vs. ${forecastYear - 1}, ${forecastYear - 2} y ${forecastYear - 3}`}
          description={`Compara la proyección del ejercicio en curso contra los 3 años anuales reales anteriores — mismo contenido que el Informe Anual Prometheia`}
        />

        <ComparisonAIReportPanel
          companyId={companyId}
          companyName={companyName}
          type="FORECAST_BUDGET_VS_ANNUAL"
          title={`Budget ${budgetYear} vs. Forecast ${forecastYear}, ${forecastYear - 1} y ${forecastYear - 2}`}
          description={`Compara el presupuesto del próximo año contra el Forecast del ejercicio en curso y los 2 años anuales reales anteriores`}
        />
      </div>
    </DashboardLayout>
  );
};
