/**
 * Hoja 4.0 - Configurar Tasas de Crecimiento
 * Punto de entrada para las proyecciones. El usuario configura aquí las tasas
 * que alimentan las hojas 4.1, 4.2 y 4.3.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import {
  projectionsService,
  type ProjectionScenarioWithData,
  type FinancialProjection,
  type HistoricalRates,
  type AnnualSuggestedRates,
} from '../../services/projections.service';
import { PercentInput } from '../../components/ui/PercentInput';
import { formatRateReference } from '../../utils/percent';
import { companyService } from '../../services/company.service';
import { toast } from 'sonner';
import { Settings, TrendingUp, ArrowRight, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface GrowthRatesConfigPageProps {
  tabsHeader?: React.ReactNode;
}

type UniformRates = Record<keyof AnnualSuggestedRates, number>;

// Tasa impositiva si no hay ningún año histórico con EBT positivo
const DEFAULT_TAX_RATE = 0.27;

const toPct = (rate: number | string | null | undefined): number =>
  rate === null || rate === undefined || rate === '' ? 0 : Number(rate) * 100;

const ratesFromSuggestions = (s: AnnualSuggestedRates | null): UniformRates => ({
  revenueGrowthRate: toPct(s?.revenueGrowthRate),
  costOfSalesGrowthRate: toPct(s?.costOfSalesGrowthRate),
  otherOperatingExpensesGrowthRate: toPct(s?.otherOperatingExpensesGrowthRate),
  depreciationGrowthRate: toPct(s?.depreciationGrowthRate),
  exceptionalNetGrowthRate: toPct(s?.exceptionalNetGrowthRate),
  financialNetGrowthRate: toPct(s?.financialNetGrowthRate),
  totalAssetsGrowthRate: toPct(s?.totalAssetsGrowthRate),
  equityGrowthRate: toPct(s?.equityGrowthRate),
  totalLiabilitiesGrowthRate: toPct(s?.totalLiabilitiesGrowthRate),
  taxRate: toPct(s?.taxRate ?? DEFAULT_TAX_RATE),
});

const ratesFromProjection = (p: FinancialProjection): UniformRates => ({
  revenueGrowthRate: toPct(p.revenueGrowthRate),
  costOfSalesGrowthRate: toPct(p.costOfSalesGrowthRate),
  otherOperatingExpensesGrowthRate: toPct(p.otherOperatingExpensesGrowthRate),
  depreciationGrowthRate: toPct(p.depreciationGrowthRate),
  exceptionalNetGrowthRate: toPct(p.exceptionalNetGrowthRate),
  financialNetGrowthRate: toPct(p.financialIncomeGrowthRate),
  totalAssetsGrowthRate: toPct(p.totalAssetsGrowthRate),
  equityGrowthRate: toPct(p.equityGrowthRate),
  totalLiabilitiesGrowthRate: toPct(p.totalLiabilitiesGrowthRate),
  taxRate: toPct(p.incomeTaxRate ?? DEFAULT_TAX_RATE),
});

export const GrowthRatesConfigPage: React.FC<GrowthRatesConfigPageProps> = ({ tabsHeader }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const companyId = searchParams.get('companyId');
  const scenarioId = searchParams.get('scenarioId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [scenario, setScenario] = useState<ProjectionScenarioWithData | null>(null);

  // Tasas uniformes (se aplican a todos los años), en puntos porcentuales (5 = 5%)
  const [uniformRates, setUniformRates] = useState<UniformRates>(() => ratesFromSuggestions(null));
  // Promedio histórico de los últimos 3 años de "Datos anuales" (referencia)
  const [historical, setHistorical] = useState<HistoricalRates | null>(null);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  // Valores iniciales: las tasas ya guardadas en el escenario; si aún no se
  // aplicaron, el promedio histórico de los últimos 3 años.
  const initRates = async (sc: ProjectionScenarioWithData | null) => {
    let hist: HistoricalRates | null = null;
    try {
      hist = await projectionsService.getHistoricalRates(companyId!, sc?.baseYear);
    } catch (err) {
      console.error('Error loading historical rates:', err);
    }
    setHistorical(hist);

    const firstProjected = sc?.projections?.find((p) => p.year > sc.baseYear);
    const hasSavedRates =
      firstProjected?.revenueGrowthRate !== null && firstProjected?.revenueGrowthRate !== undefined;
    setUniformRates(
      hasSavedRates ? ratesFromProjection(firstProjected!) : ratesFromSuggestions(hist?.annual ?? null),
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const companyData = await companyService.getCompany(companyId!);
      setCompany(companyData);

      // Auto-cargar el escenario especificado en URL o el más reciente
      let sc: ProjectionScenarioWithData | null = null;
      if (scenarioId) {
        sc = await projectionsService.getScenario(scenarioId);
      } else {
        const scenarios = await projectionsService.getCompanyScenarios(companyId!);
        if (scenarios.length > 0) {
          sc = scenarios[0];
          const newParams = new URLSearchParams(searchParams);
          newParams.set('scenarioId', sc.id);
          setSearchParams(newParams);
        }
      }
      setScenario(sc);
      await initRates(sc);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScenario = async () => {
    try {
      setSaving(true);
      const newScenario = await projectionsService.createScenario({
        companyId: companyId!,
        projectionYears: 10,
        name: `Proyección ${new Date().getFullYear()} - ${company?.name}`,
      });
      toast.success('Escenario de proyección creado');
      setScenario(newScenario);
      await initRates(newScenario);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('scenarioId', newScenario.id);
      setSearchParams(newParams);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Error al crear escenario');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyRates = async () => {
    if (!scenario) return;
    try {
      setSaving(true);
      // Convertir de porcentaje a decimal y aplicar a todos los años
      const growthRatesArray = scenario.projections.map((proj) => ({
        year: proj.year,
        revenueGrowthRate: uniformRates.revenueGrowthRate / 100,
        costOfSalesGrowthRate: uniformRates.costOfSalesGrowthRate / 100,
        otherOperatingExpensesGrowthRate: uniformRates.otherOperatingExpensesGrowthRate / 100,
        depreciationGrowthRate: uniformRates.depreciationGrowthRate / 100,
        exceptionalNetGrowthRate: uniformRates.exceptionalNetGrowthRate / 100,
        financialIncomeGrowthRate: uniformRates.financialNetGrowthRate / 100,
        financialExpensesGrowthRate: 0,
        totalAssetsGrowthRate: uniformRates.totalAssetsGrowthRate / 100,
        equityGrowthRate: uniformRates.equityGrowthRate / 100,
        totalLiabilitiesGrowthRate: uniformRates.totalLiabilitiesGrowthRate / 100,
        incomeTaxRate: uniformRates.taxRate / 100,
        workingCapitalInvestmentGrowthRate: uniformRates.totalAssetsGrowthRate / 100,
        fixedAssetsInvestmentGrowthRate: uniformRates.totalAssetsGrowthRate / 100,
      }));
      await projectionsService.applyGrowthRates(scenario.id, growthRatesArray);
      toast.success('Tasas de crecimiento aplicadas a todos los años');
    } catch (err: any) {
      toast.error('Error al aplicar tasas de crecimiento');
    } finally {
      setSaving(false);
    }
  };

  const navigateTo = (view: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', view);
    setSearchParams(newParams);
  };

  const RATE_FIELDS = [
    { key: 'revenueGrowthRate', label: 'Crecimiento Ventas', color: 'text-green-700', section: 'P&G' },
    { key: 'costOfSalesGrowthRate', label: 'Crecimiento Coste de Ventas', color: 'text-green-700', section: 'P&G' },
    { key: 'otherOperatingExpensesGrowthRate', label: 'Crecimiento Otros Gastos Operativos', color: 'text-green-700', section: 'P&G' },
    { key: 'depreciationGrowthRate', label: 'Crecimiento Depreciaciones', color: 'text-green-700', section: 'P&G' },
    { key: 'exceptionalNetGrowthRate', label: 'Crecimiento Excepcionales Netos (+ -)', color: 'text-green-700', section: 'P&G' },
    { key: 'financialNetGrowthRate', label: 'Crecimiento Financieros Netos (+ -)', color: 'text-green-700', section: 'P&G' },
    { key: 'totalAssetsGrowthRate', label: 'Crecimiento Total Activos', color: 'text-blue-700', section: 'Balance' },
    { key: 'equityGrowthRate', label: 'Crecimiento Patrimonio Neto', color: 'text-blue-700', section: 'Balance' },
    { key: 'totalLiabilitiesGrowthRate', label: 'Crecimiento Total Pasivos', color: 'text-blue-700', section: 'Balance' },
    { key: 'taxRate', label: 'Tasa Impositiva (Impuesto a la Renta)', color: 'text-amber-700', section: 'Impuestos' },
  ] as const;

  // ── Loading ──
  if (loading) {
    return (
      <DashboardLayout>
        {tabsHeader}
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
      {tabsHeader}
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Settings className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hoja 4.0 — Configurar Tasas de Crecimiento</h1>
              <p className="text-gray-600">{company?.name}</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Instrucciones:</strong> Defina aquí las tasas de crecimiento uniformes que se aplicarán a todos los años de proyección.
              Estas tasas alimentan las hojas <strong>4.1 (Proyección Completa)</strong>, <strong>4.2 (Proyección Simplificada)</strong> y <strong>4.3 (Valoración DCF)</strong>.
            </p>
          </div>
        </div>

        {/* Sin escenario — crear primero */}
        {!scenario ? (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
            <AlertCircle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay proyección creada aún</h3>
            <p className="text-gray-600 mb-6">
              Para poder configurar las tasas de crecimiento, primero debes crear un escenario de proyección.
            </p>
            <Button onClick={handleCreateScenario} disabled={saving} isLoading={saving}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Escenario de Proyección
            </Button>
          </div>
        ) : (
          <>
            {/* Escenario activo */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-green-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">{scenario.name}</p>
                <p className="text-xs text-green-600">
                  Año base: {scenario.baseYear} · {scenario.projectionYears} años proyectados
                </p>
              </div>
            </div>

            {/* Formulario de tasas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Tasas anuales uniformes (%)</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Estas tasas se aplican de forma uniforme a todos los {scenario.projectionYears} años proyectados.
                  Para tasas diferentes por año, edite directamente en la Hoja 4.2.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Valores sugeridos: promedio del crecimiento de los últimos 3 años de Datos anuales
                  {historical && historical.yearsUsed.length > 1
                    ? ` (${historical.yearsUsed[0]}–${historical.yearsUsed[historical.yearsUsed.length - 1]})`
                    : ''}
                  ; la tasa impositiva es el promedio de Impuestos / Resultado antes de impuestos. Todos son editables.
                </p>
              </div>

              <div className="p-6">
                {/* Agrupar por sección */}
                {['P&G', 'Balance', 'Impuestos'].map((section) => {
                  const fields = RATE_FIELDS.filter((f) => f.section === section);
                  return (
                    <div key={section} className="mb-6">
                      <h4 className={`text-sm font-semibold mb-3 ${fields[0].color}`}>
                        {section === 'P&G' ? 'Cuenta de Pérdidas y Ganancias' : section}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {fields.map(({ key, label }) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{label} (%)</label>
                            <div className="flex items-center gap-3">
                              <PercentInput
                                className="flex-1"
                                value={uniformRates[key]}
                                onCommit={(v) =>
                                  setUniformRates((prev) => ({ ...prev, [key]: v ?? 0 }))
                                }
                                aria-label={label}
                              />
                              <span
                                className="w-32 shrink-0 text-xs text-gray-500 leading-tight"
                                title="Valor sugerido: promedio de los últimos 3 años de Datos anuales"
                              >
                                Prom. 3 años:{' '}
                                <span className="font-mono text-gray-700">
                                  {formatRateReference(historical?.annual[key])}
                                </span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button
                    onClick={handleApplyRates}
                    disabled={saving}
                    isLoading={saving}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Aplicar Tasas a Todos los Años
                  </Button>
                </div>
              </div>
            </div>

            {/* Accesos rápidos a otras hojas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { view: '4.1', label: 'Ver Proyección Completa', desc: 'Balance, P&G, Ratios y FCF calculados', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
                { view: '4.2', label: 'Editar Año por Año', desc: 'Ajuste manual de tasas por año', color: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' },
                { view: '4.3', label: 'Valoración DCF', desc: 'Calcular el valor de la empresa', color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
              ].map(({ view, label, desc, color }) => (
                <button
                  key={view}
                  onClick={() => navigateTo(view)}
                  className={`p-4 border rounded-xl text-left transition-colors ${color}`}
                >
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs mt-1 opacity-75">{desc}</p>
                  <div className="flex justify-end mt-2">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
