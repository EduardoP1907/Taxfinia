/**
 * Hoja 4.0 - Configurar Tasas de Crecimiento
 * Punto de entrada para las proyecciones. El usuario configura aquí las tasas
 * que alimentan las hojas 4.1, 4.2 y 4.3.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { projectionsService, type ProjectionScenarioWithData } from '../../services/projections.service';
import { companyService } from '../../services/company.service';
import { toast } from 'sonner';
import { Settings, TrendingUp, ArrowRight, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface GrowthRatesConfigPageProps {
  tabsHeader?: React.ReactNode;
}

export const GrowthRatesConfigPage: React.FC<GrowthRatesConfigPageProps> = ({ tabsHeader }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyId = searchParams.get('companyId');
  const scenarioId = searchParams.get('scenarioId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [scenario, setScenario] = useState<ProjectionScenarioWithData | null>(null);

  // Tasas uniformes (se aplican a todos los años)
  const [uniformRates, setUniformRates] = useState({
    revenueGrowthRate: 5,
    costOfSalesGrowthRate: 4,
    otherOperatingExpensesGrowthRate: 3,
    depreciationGrowthRate: 2,
    totalAssetsGrowthRate: 5,
    equityGrowthRate: 5,
    totalLiabilitiesGrowthRate: 5,
    taxRate: 27,
  });

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const companyData = await companyService.getCompany(companyId!);
      setCompany(companyData);

      // Auto-cargar el escenario más reciente o el especificado en URL
      const sid = scenarioId;
      if (sid) {
        const sc = await projectionsService.getScenario(sid);
        setScenario(sc);
        // Pre-cargar tasas del primer año de proyección si existen
        if (sc.projections && sc.projections.length > 0) {
          const firstProj = sc.projections[0];
          setUniformRates({
            revenueGrowthRate: Math.round((firstProj.revenueGrowthRate ?? 0.05) * 100 * 100) / 100,
            costOfSalesGrowthRate: Math.round((firstProj.costOfSalesGrowthRate ?? 0.04) * 100 * 100) / 100,
            otherOperatingExpensesGrowthRate: Math.round((firstProj.otherOperatingExpensesGrowthRate ?? 0.03) * 100 * 100) / 100,
            depreciationGrowthRate: Math.round((firstProj.depreciationGrowthRate ?? 0.02) * 100 * 100) / 100,
            totalAssetsGrowthRate: Math.round((firstProj.totalAssetsGrowthRate ?? 0.05) * 100 * 100) / 100,
            equityGrowthRate: Math.round((firstProj.equityGrowthRate ?? 0.05) * 100 * 100) / 100,
            totalLiabilitiesGrowthRate: Math.round((firstProj.totalLiabilitiesGrowthRate ?? 0.05) * 100 * 100) / 100,
            taxRate: Math.round((firstProj.taxRate ?? 0.27) * 100 * 100) / 100,
          });
        }
      } else {
        // Intentar cargar el escenario más reciente
        const scenarios = await projectionsService.getCompanyScenarios(companyId!);
        if (scenarios.length > 0) {
          const latest = scenarios[0];
          setScenario(latest);
          const newParams = new URLSearchParams(searchParams);
          newParams.set('scenarioId', latest.id);
          setSearchParams(newParams);
          if (latest.projections && latest.projections.length > 0) {
            const firstProj = latest.projections[0];
            setUniformRates({
              revenueGrowthRate: Math.round((firstProj.revenueGrowthRate ?? 0.05) * 100 * 100) / 100,
              costOfSalesGrowthRate: Math.round((firstProj.costOfSalesGrowthRate ?? 0.04) * 100 * 100) / 100,
              otherOperatingExpensesGrowthRate: Math.round((firstProj.otherOperatingExpensesGrowthRate ?? 0.03) * 100 * 100) / 100,
              depreciationGrowthRate: Math.round((firstProj.depreciationGrowthRate ?? 0.02) * 100 * 100) / 100,
              totalAssetsGrowthRate: Math.round((firstProj.totalAssetsGrowthRate ?? 0.05) * 100 * 100) / 100,
              equityGrowthRate: Math.round((firstProj.equityGrowthRate ?? 0.05) * 100 * 100) / 100,
              totalLiabilitiesGrowthRate: Math.round((firstProj.totalLiabilitiesGrowthRate ?? 0.05) * 100 * 100) / 100,
              taxRate: Math.round((firstProj.taxRate ?? 0.27) * 100 * 100) / 100,
            });
          }
        }
      }
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
        totalAssetsGrowthRate: uniformRates.totalAssetsGrowthRate / 100,
        equityGrowthRate: uniformRates.equityGrowthRate / 100,
        totalLiabilitiesGrowthRate: uniformRates.totalLiabilitiesGrowthRate / 100,
        taxRate: uniformRates.taxRate / 100,
        exceptionalNetGrowthRate: 0,
        financialIncomeGrowthRate: 0,
        financialExpensesGrowthRate: 0,
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
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                value={uniformRates[key]}
                                onChange={(e) =>
                                  setUniformRates((prev) => ({
                                    ...prev,
                                    [key]: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-right font-mono"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
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
