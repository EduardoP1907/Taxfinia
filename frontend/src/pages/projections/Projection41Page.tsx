/**
 * Projection 4.1 Page
 * Proyección Modelo A - Hoja 4.1 del Excel
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { projectionsService, type ProjectionScenarioWithData } from '../../services/projections.service';
import { companyService } from '../../services/company.service';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Calculator, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GrowthRatesModal } from '../../components/projections/GrowthRatesModal';

interface Projection41PageProps {
  tabsHeader?: React.ReactNode;
}

export const Projection41Page: React.FC<Projection41PageProps> = ({ tabsHeader }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyId = searchParams.get('companyId');
  const scenarioId = searchParams.get('scenarioId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [scenario, setScenario] = useState<ProjectionScenarioWithData | null>(null);
  const [projections, setProjections] = useState<any[]>([]);
  const [showGrowthRatesModal, setShowGrowthRatesModal] = useState(false);

  useEffect(() => {
    console.log('[EFFECT] companyId:', companyId, 'scenarioId:', scenarioId);
    if (companyId) {
      loadData();
    } else {
      loadCompanies();
    }
  }, [companyId, scenarioId]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await companyService.getCompanies();
      setCompanies(data);
    } catch (error: any) {
      console.error('Error loading companies:', error);
      toast.error('Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      console.log('[LOAD DATA] Starting... companyId:', companyId, 'scenarioId:', scenarioId);
      setLoading(true);

      const companyData = await companyService.getCompany(companyId!);
      console.log('[LOAD DATA] Company loaded:', companyData);
      setCompany(companyData);

      if (scenarioId) {
        console.log('[LOAD DATA] Loading scenario:', scenarioId);
        const scenarioData = await projectionsService.getScenario(scenarioId);
        console.log('[LOAD DATA] Scenario loaded:', scenarioData);
        setScenario(scenarioData);
        setProjections(scenarioData.projections || []);
      }
      console.log('[LOAD DATA] Success!');
    } catch (error: any) {
      console.error('[LOAD DATA] Error loading data:', error);
      console.error('[LOAD DATA] Error details:', error.response?.data);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScenario = async () => {
    try {
      setSaving(true);
      console.log('Creating scenario for company:', companyId);

      const newScenario = await projectionsService.createScenario({
        companyId: companyId!,
        projectionYears: 10,
        name: `Proyección 4.1 - ${new Date().toLocaleDateString('es-ES')}`,
      });

      console.log('Scenario created:', newScenario);
      console.log('Scenario ID:', newScenario?.id);

      toast.success('Escenario creado correctamente');

      // Mantener el parámetro view si existe
      const currentView = searchParams.get('view');
      const viewParam = currentView ? `&view=${currentView}` : '';

      // Verificar que tenemos el ID antes de navegar
      if (newScenario && newScenario.id) {
        console.log('Navigating to:', `/proyecciones?companyId=${companyId}&scenarioId=${newScenario.id}${viewParam}`);
        navigate(`/proyecciones?companyId=${companyId}&scenarioId=${newScenario.id}${viewParam}`);
      } else {
        console.error('No scenario ID returned:', newScenario);
        toast.error('Error: No se recibió el ID del escenario');
      }
    } catch (error: any) {
      console.error('Error creating scenario:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.error || 'Error al crear escenario');
    } finally {
      setSaving(false);
    }
  };

  // Funciones de formateo
  const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  };

  const parseFormattedNumber = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    // Eliminar todo excepto números, punto, coma y signo negativo
    const cleaned = value
      .replace(/[^\d.,-]/g, '') // Mantener solo dígitos, punto, coma y signo
      .replace(/\./g, '') // Eliminar puntos (separadores de miles)
      .replace(',', '.'); // Convertir coma decimal a punto
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleUpdateProjection = async (projectionId: string, field: string, value: any) => {
    try {
      // Actualizar en el backend
      const updated = await projectionsService.updateProjection(projectionId, { [field]: value });

      // Detectar si es un campo de tasa de crecimiento
      const isGrowthRateField = field.endsWith('GrowthRate');

      // Campos de valor que pueden generar tasas de crecimiento automáticas
      const valueFieldsThatTriggerProjection = [
        'revenue',
        'costOfSales',
        'otherOperatingExpenses',
        'depreciation',
        'exceptionalNet',
        'financialIncome',
        'financialExpenses',
        'totalAssets',
        'equity',
        'totalLiabilities'
      ];

      // Si se actualizó una tasa de crecimiento O un valor que genera tasa automática,
      // recargar todo el escenario porque afecta a años futuros
      if (isGrowthRateField || valueFieldsThatTriggerProjection.includes(field)) {
        console.log(`🔄 Campo ${field} actualizado, recargando escenario completo...`);
        const refreshedScenario = await projectionsService.getScenario(scenarioId!);
        setProjections(refreshedScenario.projections || []);

        // Mostrar mensaje apropiado
        if (isGrowthRateField) {
          toast.success('Tasa de crecimiento aplicada a años futuros');
        } else {
          toast.success('Valor actualizado y tasa de crecimiento calculada automáticamente');
        }
      } else {
        // Actualizar solo la proyección actual
        setProjections((prev) =>
          prev.map((proj) =>
            proj.id === projectionId ? { ...proj, ...updated } : proj
          )
        );
      }
    } catch (error: any) {
      console.error('Error updating projection:', error);
      toast.error('Error al actualizar proyección');
      // Recargar datos en caso de error
      loadData();
    }
  };

  const handleApplyGrowthRates = async (rates: any[]) => {
    try {
      // Convertir rates array al formato esperado por el backend
      const ratesObject: any = {};
      rates.forEach((rate) => {
        if (rate.rate !== 0) {
          ratesObject[rate.field] = rate.rate;
        }
      });

      // Llamar al servicio
      const updated = await projectionsService.applyUniformGrowthRates(
        scenarioId!,
        ratesObject
      );

      // Actualizar el estado local con los nuevos datos
      setScenario(updated);
      setProjections(updated.projections || []);

      toast.success('Tasas de crecimiento aplicadas exitosamente');
    } catch (error: any) {
      console.error('Error applying growth rates:', error);
      throw error; // Re-lanzar para que el modal maneje el error
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Company selection
  if (!companyId) {
    return (
      <DashboardLayout>
        {tabsHeader}
        <div className="max-w-2xl mx-auto mt-16">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-6">
              <Calculator className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Proyecciones Hoja 4.1
              </h2>
              <p className="text-gray-600">
                Selecciona una empresa para crear proyecciones
              </p>
            </div>

            <div className="space-y-3">
              {companies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tienes empresas creadas</p>
                  <Button onClick={() => navigate('/empresas')} className="mt-4">
                    Crear primera empresa
                  </Button>
                </div>
              ) : (
                companies.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => navigate(`/proyecciones-41?companyId=${comp.id}`)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                        <p className="text-sm text-gray-600">{comp.taxId || 'Sin RUT'}</p>
                      </div>
                      <ArrowLeft className="w-5 h-5 rotate-180 text-blue-600" />
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="mt-6 text-center">
              <Button onClick={() => navigate('/dashboard')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Dashboard
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Create scenario view
  if (!scenarioId) {
    return (
      <DashboardLayout>
        {tabsHeader}
        <div className="max-w-2xl mx-auto mt-16">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Calculator className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Proyección Hoja 4.1
            </h2>
            <p className="text-gray-600 mb-6">
              Crear proyección a 10 años para {company?.name}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-800 font-semibold mb-2">
                La Hoja 4.1 incluye:
              </p>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>Balance (Activo, Patrimonio, Pasivo)</li>
                <li>Cuenta de Resultados (EBITDA, EBIT, Beneficio Neto)</li>
                <li>Resultados Financieros</li>
                <li>Ratios (ROA, ROE, Apalancamiento)</li>
                <li>Flujos de Caja (FCF)</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/empresas')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <Button onClick={handleCreateScenario} disabled={saving}>
                <Plus className="w-4 h-4 mr-2" />
                {saving ? 'Creando...' : 'Crear Proyección (10 años)'}
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Main view with scenario data
  return (
    <DashboardLayout>
      {tabsHeader}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/empresas')} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Proyección Hoja 4.1
              </h1>
              <p className="text-gray-600">
                {company?.name} - {scenario?.name}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowGrowthRatesModal(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Configurar Tasas de Crecimiento
          </Button>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Año Base:</strong> {scenario?.baseYear} | <strong>Años:</strong>{' '}
            {scenario?.projectionYears}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Los cálculos se actualizan automáticamente según las fórmulas del Excel
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Proyecciones</h3>
            {projections && projections.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-900">
                        Concepto
                      </th>
                      {projections.map((proj) => (
                        <th
                          key={proj.id}
                          className="px-4 py-3 text-center font-medium text-gray-900"
                        >
                          {proj.year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="bg-blue-50">
                      <td colSpan={projections.length + 1} className="px-4 py-2 font-bold">
                        BALANCE
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">TOTAL ACTIVO</td>
                      {projections.map((proj, index) => {
                        const isBaseYear = index === 0;
                        return (
                          <td key={proj.id} className="px-2 py-2">
                            <Input
                              type="text"
                              value={formatNumber(proj.totalAssets)}
                              onChange={(e) => {
                                const numValue = parseFormattedNumber(e.target.value);
                                handleUpdateProjection(proj.id, 'totalAssets', numValue);
                              }}
                              className="text-right text-sm"
                              title={isBaseYear ? 'Editable - Año base' : 'Editable - Se calcula tasa de crecimiento automáticamente'}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="px-4 py-2">PATRIMONIO NETO</td>
                      {projections.map((proj, index) => {
                        const isBaseYear = index === 0;
                        return (
                          <td key={proj.id} className="px-2 py-2">
                            <Input
                              type="text"
                              value={formatNumber(proj.equity)}
                              onChange={(e) => {
                                const numValue = parseFormattedNumber(e.target.value);
                                handleUpdateProjection(proj.id, 'equity', numValue);
                              }}
                              className="text-right text-sm"
                              title={isBaseYear ? 'Editable - Año base' : 'Editable - Se calcula tasa de crecimiento automáticamente'}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="px-4 py-2">TOTAL PASIVO</td>
                      {projections.map((proj, index) => {
                        const isBaseYear = index === 0;
                        return (
                          <td key={proj.id} className="px-2 py-2">
                            <Input
                              type="text"
                              value={formatNumber(proj.totalLiabilities)}
                              onChange={(e) => {
                                const numValue = parseFormattedNumber(e.target.value);
                                handleUpdateProjection(proj.id, 'totalLiabilities', numValue);
                              }}
                              className="text-right text-sm"
                              title={isBaseYear ? 'Editable - Año base' : 'Editable - Se calcula tasa de crecimiento automáticamente'}
                            />
                          </td>
                        );
                      })}
                    </tr>

                    <tr className="bg-green-50">
                      <td colSpan={projections.length + 1} className="px-4 py-2 font-bold">
                        RESULTADOS
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Ingresos por VENTAS</td>
                      {projections.map((proj, index) => {
                        const isBaseYear = index === 0;
                        return (
                          <td key={proj.id} className="px-2 py-2">
                            <Input
                              type="text"
                              value={formatNumber(proj.revenue)}
                              onChange={async (e) => {
                                const numValue = parseFormattedNumber(e.target.value);

                                // Si es año futuro, calcular la tasa de crecimiento automáticamente
                                if (!isBaseYear && index > 0) {
                                  const priorYear = projections[index - 1];
                                  const priorRevenue = Number(priorYear.revenue);

                                  if (priorRevenue > 0) {
                                    // Calcular tasa: (Nuevo - Anterior) / Anterior
                                    const growthRate = (numValue - priorRevenue) / priorRevenue;
                                    // Actualizar tanto el valor como la tasa
                                    await handleUpdateProjection(proj.id, 'revenue', numValue);
                                    await handleUpdateProjection(proj.id, 'revenueGrowthRate', growthRate);
                                  }
                                } else {
                                  // Año base, solo actualizar el valor
                                  handleUpdateProjection(proj.id, 'revenue', numValue);
                                }
                              }}
                              className="text-right text-sm"
                              title={isBaseYear ? 'Editable' : 'Editable - Al cambiar se calcula la tasa de crecimiento'}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="bg-yellow-50 font-semibold">
                      <td className="px-4 py-2">EBITDA</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <Input
                            type="text"
                            value={formatNumber(proj.ebitda)}
                            readOnly
                            className="text-right text-sm font-semibold bg-gray-50 text-gray-700"
                            title="Calculado automáticamente"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-yellow-50 font-semibold">
                      <td className="px-4 py-2">B.A.I.I. - EBIT</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <Input
                            type="text"
                            value={formatNumber(proj.ebit)}
                            readOnly
                            className="text-right text-sm font-semibold bg-gray-50 text-gray-700"
                            title="Calculado automáticamente"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-blue-100 font-semibold">
                      <td className="px-4 py-2">NOPAT - B. Operativo Neto</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <Input
                            type="text"
                            value={formatNumber(proj.nopat)}
                            readOnly
                            className="text-right text-sm font-semibold bg-gray-50 text-gray-700"
                            title="Calculado: EBIT × (1 - Tax Rate)"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-yellow-50 font-semibold">
                      <td className="px-4 py-2">B.A.I. - Beneficio bruto</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <Input
                            type="text"
                            value={formatNumber(proj.ebt)}
                            readOnly
                            className="text-right text-sm font-semibold bg-gray-50 text-gray-700"
                            title="Calculado automáticamente"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-green-100 font-semibold">
                      <td className="px-4 py-2">Beneficio Neto</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <Input
                            type="text"
                            value={formatNumber(proj.netIncome)}
                            readOnly
                            className="text-right text-sm font-semibold bg-gray-50 text-gray-700"
                            title="Calculado automáticamente"
                          />
                        </td>
                      ))}
                    </tr>

                    <tr className="bg-amber-50">
                      <td colSpan={projections.length + 1} className="px-4 py-2 font-bold">
                        RATIOS
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">ROA - Rentab. Económica</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <Input
                            type="text"
                            value={proj.roa !== null ? (Number(proj.roa) * 100).toFixed(2) + '%' : '-'}
                            readOnly
                            className="text-right text-sm bg-gray-50 text-gray-700"
                            title="Calculado: Operating Result / Total Activo"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Riesgo Operativo</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <Input
                            type="text"
                            value={proj.operationalRisk !== null ? proj.operationalRisk.toFixed(4) : '-'}
                            readOnly
                            className="text-right text-sm bg-gray-50 text-gray-700"
                            title="Calculado: EBIT / EBT"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-2">ROE - Rentab. Financiera</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <Input
                            type="text"
                            value={proj.roe !== null ? (Number(proj.roe) * 100).toFixed(2) + '%' : '-'}
                            readOnly
                            className="text-right text-sm bg-gray-50 text-gray-700"
                            title="Calculado: Beneficio Neto / Patrimonio Neto"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Apalancamiento Financiero</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <Input
                            type="text"
                            value={proj.financialLeverage !== null ? proj.financialLeverage.toFixed(2) : '-'}
                            readOnly
                            className="text-right text-sm bg-gray-50 text-gray-700"
                            title="Calculado: Total Activo / Patrimonio Neto"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Riesgo Financiero</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <Input
                            type="text"
                            value={proj.financialRisk !== null ? proj.financialRisk.toFixed(4) : '-'}
                            readOnly
                            className="text-right text-sm bg-gray-50 text-gray-700"
                            title="Calculado: EBT / EBIT"
                          />
                        </td>
                      ))}
                    </tr>

                    <tr className="bg-slate-50">
                      <td colSpan={projections.length + 1} className="px-4 py-2 font-bold">
                        CASH FLOW
                      </td>
                    </tr>
                    <tr className="bg-green-100 font-semibold">
                      <td className="px-4 py-2">Free Cash flow (s/a)</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <Input
                            type="text"
                            value={formatNumber(proj.freeCashFlow)}
                            readOnly
                            className="text-right text-sm font-semibold bg-gray-50 text-gray-700"
                            title="Calculado: NOPAT - (Total Activo Actual - Total Activo Año Anterior)"
                          />
                        </td>
                      ))}
                    </tr>

                    <tr className="bg-orange-50">
                      <td colSpan={projections.length + 1} className="px-4 py-2 font-bold">
                        VARIACIONES (Tasas de Crecimiento %)
                      </td>
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="px-4 py-2 text-xs italic text-gray-600">Ingresos por VENTAS</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <div className="relative">
                            <Input
                              type="text"
                              defaultValue={proj.revenueGrowthRate !== null ? (proj.revenueGrowthRate * 100).toFixed(2) : ''}
                              onBlur={(e) => {
                                const value = e.target.value.replace(/[^0-9.,-]/g, '');
                                const numValue = value && value.trim() !== '' ? parseFloat(value.replace(',', '.')) / 100 : null;
                                handleUpdateProjection(proj.id, 'revenueGrowthRate', numValue);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="text-right text-xs bg-orange-50 border-orange-200 pr-6"
                              placeholder="0.00"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">%</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="px-4 py-2 text-xs italic text-gray-600">Coste de las ventas</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <div className="relative">
                            <Input
                              type="text"
                              defaultValue={proj.costOfSalesGrowthRate !== null ? (proj.costOfSalesGrowthRate * 100).toFixed(2) : ''}
                              onBlur={(e) => {
                                const value = e.target.value.replace(/[^0-9.,-]/g, '');
                                const numValue = value && value.trim() !== '' ? parseFloat(value.replace(',', '.')) / 100 : null;
                                handleUpdateProjection(proj.id, 'costOfSalesGrowthRate', numValue);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="text-right text-xs bg-orange-50 border-orange-200 pr-6"
                              placeholder="0.00"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">%</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="px-4 py-2 text-xs italic text-gray-600">Otros gastos explotación</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <div className="relative">
                            <Input
                              type="text"
                              defaultValue={proj.otherOperatingExpensesGrowthRate !== null ? (proj.otherOperatingExpensesGrowthRate * 100).toFixed(2) : ''}
                              onBlur={(e) => {
                                const value = e.target.value.replace(/[^0-9.,-]/g, '');
                                const numValue = value && value.trim() !== '' ? parseFloat(value.replace(',', '.')) / 100 : null;
                                handleUpdateProjection(proj.id, 'otherOperatingExpensesGrowthRate', numValue);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="text-right text-xs bg-orange-50 border-orange-200 pr-6"
                              placeholder="0.00"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">%</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="px-4 py-2 text-xs italic text-gray-600">Depreciaciones - Amort</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <div className="relative">
                            <Input
                              type="text"
                              defaultValue={proj.depreciationGrowthRate !== null ? (proj.depreciationGrowthRate * 100).toFixed(2) : ''}
                              onBlur={(e) => {
                                const value = e.target.value.replace(/[^0-9.,-]/g, '');
                                const numValue = value && value.trim() !== '' ? parseFloat(value.replace(',', '.')) / 100 : null;
                                handleUpdateProjection(proj.id, 'depreciationGrowthRate', numValue);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="text-right text-xs bg-orange-50 border-orange-200 pr-6"
                              placeholder="0.00"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">%</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="px-4 py-2 text-xs italic text-gray-600">Excepcionales Netos (+ -)</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <div className="relative">
                            <Input
                              type="text"
                              defaultValue={proj.exceptionalNetGrowthRate !== null ? (proj.exceptionalNetGrowthRate * 100).toFixed(2) : ''}
                              onBlur={(e) => {
                                const value = e.target.value.replace(/[^0-9.,-]/g, '');
                                const numValue = value && value.trim() !== '' ? parseFloat(value.replace(',', '.')) / 100 : null;
                                handleUpdateProjection(proj.id, 'exceptionalNetGrowthRate', numValue);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="text-right text-xs bg-orange-50 border-orange-200 pr-6"
                              placeholder="0.00"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">%</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="px-4 py-2 text-xs italic text-gray-600">Financieros Netos (+ -)</td>
                      {projections.map((proj, index) => {
                        const isBaseYear = index === 0;
                        // Financieros Netos: En año base se calcula, en proyecciones usa valor del año base
                        // Excel: I21=SI(I123=0;$G21;I123) → Como I123=0, usa $G21 (año base) siempre
                        const baseFinancialNet = projections[0]?.financialNet;
                        const displayValue = proj.financialNet ?? baseFinancialNet ?? 0;

                        return (
                          <td key={proj.id} className="px-2 py-2">
                            <Input
                              type="text"
                              value={Number(displayValue).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              readOnly
                              className="text-right text-xs bg-gray-50 text-gray-700 border-orange-200"
                              title={isBaseYear
                                ? "Calculado: Ingresos Financieros - Gastos Financieros"
                                : "Usa el valor del año base (constante en todas las proyecciones)"}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="px-4 py-2 text-xs italic text-gray-600">TOTAL ACTIVO</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <div className="relative">
                            <Input
                              type="text"
                              value="100.00"
                              readOnly
                              className="text-right text-xs bg-gray-100 text-gray-500 border-orange-200 pr-6"
                              title="Siempre 100%"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">%</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="px-4 py-2 text-xs italic text-gray-600">PATRIMONIO NETO</td>
                      {projections.map((proj) => {
                        // Calcular % sobre Total Activo: Equity / Total Activo
                        const equityPercentage = proj.totalAssets && Number(proj.totalAssets) > 0
                          ? (Number(proj.equity) / Number(proj.totalAssets)) * 100
                          : 0;
                        return (
                          <td key={proj.id} className="px-2 py-2">
                            <div className="relative">
                              <Input
                                type="text"
                                value={equityPercentage.toFixed(2)}
                                readOnly
                                className="text-right text-xs bg-gray-100 text-gray-500 border-orange-200 pr-6"
                                title="Calculado: Patrimonio Neto / Total Activo"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">%</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="px-4 py-2 text-xs italic text-gray-600">TOTAL PASIVO</td>
                      {projections.map((proj) => {
                        // Calcular % sobre Total Activo: Total Pasivo / Total Activo
                        const liabilitiesPercentage = proj.totalAssets && Number(proj.totalAssets) > 0
                          ? (Number(proj.totalLiabilities) / Number(proj.totalAssets)) * 100
                          : 0;
                        return (
                          <td key={proj.id} className="px-2 py-2">
                            <div className="relative">
                              <Input
                                type="text"
                                value={liabilitiesPercentage.toFixed(2)}
                                readOnly
                                className="text-right text-xs bg-gray-100 text-gray-500 border-orange-200 pr-6"
                                title="Calculado: Total Pasivo / Total Activo"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">%</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="px-4 py-2 text-xs italic text-gray-600">Coste financiero</td>
                      {projections.map((proj) => (
                        <td key={proj.id} className="px-2 py-2">
                          <div className="relative">
                            <Input
                              type="text"
                              value={proj.financialCostRate !== null ? (proj.financialCostRate * 100).toFixed(2) : ''}
                              readOnly
                              className="text-right text-xs bg-gray-100 text-gray-500 border-orange-200 pr-6"
                              title="Calculado: -Gastos Financieros / Total Activo"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">%</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No hay datos de proyección disponibles
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de tasas de crecimiento */}
      <GrowthRatesModal
        isOpen={showGrowthRatesModal}
        onClose={() => setShowGrowthRatesModal(false)}
        onApply={handleApplyGrowthRates}
      />
    </DashboardLayout>
  );
};
