/**
 * Projection 4.3 Page
 * Valoración por DCF (Discounted Cash Flow) - Hoja 4.3 del Excel
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import {
  projectionsService,
  type ProjectionScenarioWithData,
  type DCFResults,
} from '../../services/projections.service';
import { companyService } from '../../services/company.service';
import { toast } from 'sonner';
import { ArrowLeft, Calculator, DollarSign, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface Projection43PageProps {
  tabsHeader?: React.ReactNode;
}

export const Projection43Page: React.FC<Projection43PageProps> = ({ tabsHeader }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyId = searchParams.get('companyId');
  const scenarioId = searchParams.get('scenarioId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [_calculating, _setCalculating] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [scenario, setScenario] = useState<ProjectionScenarioWithData | null>(null);
  const [_dcfResults, setDcfResults] = useState<DCFResults | null>(null);

  // DCF Parameters state — stored as plain percentages (e.g. 8 = 8%)
  const [waccPct, setWaccPct] = useState<number>(8);
  const [terminalGrowthPct, setTerminalGrowthPct] = useState<number>(2);
  const [yearsToConsider, setYearsToConsider] = useState<number>(5);

  // Parámetros auxiliares para cálculo WACC — también en %
  const [costOfDebtPct, setCostOfDebtPct] = useState<number>(4);    // Kd
  const [taxRatePct, setTaxRatePct] = useState<number>(25);          // T
  const [costOfEquityPct, setCostOfEquityPct] = useState<number>(10); // Ke
  const [debtPct, setDebtPct] = useState<number>(30);                // D/V %

  useEffect(() => {
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
      setLoading(true);

      const companyData = await companyService.getCompany(companyId!);
      setCompany(companyData);

      if (scenarioId) {
        const scenarioData = await projectionsService.getScenario(scenarioId);
        setScenario(scenarioData);

        // Load DCF parameters from scenario if they exist (convert decimals → %)
        if (scenarioData.wacc !== undefined && scenarioData.wacc !== null) {
          setWaccPct(Number(scenarioData.wacc) * 100);
        }
        if (scenarioData.terminalGrowthRate !== undefined && scenarioData.terminalGrowthRate !== null) {
          setTerminalGrowthPct(Number(scenarioData.terminalGrowthRate) * 100);
        }

        // Try to load DCF results if they exist
        if (scenarioData.wacc && scenarioData.enterpriseValue) {
          try {
            const results = await projectionsService.getDCFResults(scenarioId);
            setDcfResults(results);
          } catch (error) {
            console.log('No DCF results yet, need to calculate');
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
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
        name: `Proyección DCF 4.3 - ${new Date().toLocaleDateString('es-ES')}`,
      });

      toast.success('Escenario creado correctamente');

      const currentView = searchParams.get('view');
      const viewParam = currentView ? `&view=${currentView}` : '';

      if (newScenario && newScenario.id) {
        navigate(`/proyecciones?companyId=${companyId}&scenarioId=${newScenario.id}${viewParam}`);
      }
    } catch (error: any) {
      console.error('Error creating scenario:', error);
      toast.error(error.response?.data?.error || 'Error al crear escenario');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      // Guardar parámetros DCF (WACC, g, etc.) en la BD
      await projectionsService.updateDCFParameters(scenarioId!, {
        wacc: waccPct / 100,
        costOfDebt: costOfDebtPct / 100,
        taxRateForWacc: taxRatePct / 100,
        terminalGrowthRate: terminalGrowthPct / 100,
        netDebt: 0,
      });
      // Recalcular métricas de proyección
      await projectionsService.recalculateMetrics(scenarioId!);
      toast.success('Proyecciones y parámetros DCF guardados correctamente');
    } catch (error: any) {
      console.error('Error saving projections:', error);
      toast.error('Error al guardar las proyecciones');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    const currency = company?.currency || 'EUR';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return `${(value * 100).toFixed(decimals)}%`;
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
              <DollarSign className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Valoración DCF - Hoja 4.3
              </h2>
              <p className="text-gray-600">
                Selecciona una empresa para realizar valoración por Flujo de Caja Descontado
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
                    onClick={() => navigate(`/proyecciones-43?companyId=${comp.id}`)}
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
            <DollarSign className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Valoración DCF - Hoja 4.3
            </h2>
            <p className="text-gray-600 mb-6">
              Crear proyección para valoración DCF de {company?.name}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-800 font-semibold mb-2">
                La Hoja 4.3 (DCF) incluye:
              </p>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>Cálculo del WACC (Weighted Average Cost of Capital)</li>
                <li>Descuento de Free Cash Flows proyectados</li>
                <li>Cálculo del Valor Terminal (Gordon Growth Model)</li>
                <li>Enterprise Value y Equity Value</li>
                <li>Valor por Acción</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/empresas')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <Button onClick={handleCreateScenario} disabled={saving}>
                <Calculator className="w-4 h-4 mr-2" />
                {saving ? 'Creando...' : 'Crear Proyección DCF'}
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Convertir % → decimales para cálculos internos
  const wacc = waccPct / 100;
  const terminalGrowthRate = terminalGrowthPct / 100;
  const costOfDebt = costOfDebtPct / 100;
  const taxRate = taxRatePct / 100;
  const costOfEquity = costOfEquityPct / 100;
  const debtPercentage = debtPct / 100;
  const equityPercentage = 1 - debtPercentage;

  // WACC calculado desde los componentes (referencia)
  const calculatedWacc = (costOfDebt * (1 - taxRate) * debtPercentage) + (costOfEquity * equityPercentage);

  // Calcular factores de descuento y valores presentes para cada año
  const calculateDiscountedValues = () => {
    if (!scenario || !scenario.projections) return [];

    const projections = scenario.projections.slice(1, yearsToConsider + 1); // Excluir año base

    return projections.map((proj, index) => {
      const year = index + 1; // 1, 2, 3, etc.
      const fcf = Number(proj.freeCashFlow) || 0;
      const discountFactor = 1 / Math.pow(1 + wacc, year);
      const pv = fcf * discountFactor;

      return {
        year: proj.year,
        yearIndex: year,
        fcf,
        discountFactor,
        pv,
      };
    });
  };

  // Calcular valor terminal y valor de empresa
  const calculateEnterpriseValue = () => {
    const discountedValues = calculateDiscountedValues();
    if (discountedValues.length === 0) return null;

    // Suma de VP de FCFs
    const sumPvOfFCFs = discountedValues.reduce((sum, item) => sum + item.pv, 0);

    // Valor Terminal = FCF último año × (1 + g) / (WACC - g)
    const lastFCF = discountedValues[discountedValues.length - 1].fcf;
    const terminalValue = (lastFCF * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate);

    // VP del Valor Terminal
    const pvOfTerminalValue = terminalValue * discountedValues[discountedValues.length - 1].discountFactor;

    // Valor Empresa = Suma VP + VP Valor Terminal
    const enterpriseValue = sumPvOfFCFs + pvOfTerminalValue;

    return {
      sumPvOfFCFs,
      terminalValue,
      pvOfTerminalValue,
      enterpriseValue,
      discountedValues,
    };
  };

  const valuationData = calculateEnterpriseValue();

  // Main DCF view
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
                Valoración DCF - Hoja 4.3
              </h1>
              <p className="text-gray-600">
                {company?.name} - {scenario?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Sección 1: PROYECCIONES DE FLUJO DE CAJA */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              PROYECCIONES DE FLUJO DE CAJA
            </h3>
          </div>
          <div className="p-6 overflow-x-auto">
            {scenario && scenario.projections && scenario.projections.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-900">Concepto</th>
                    {scenario.projections.slice(1, 11).map((proj) => (
                      <th key={proj.id} className="px-4 py-3 text-center font-medium text-gray-900">
                        {proj.year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-4 py-2 font-medium">Flujo de Caja Libre Proyección</td>
                    {scenario.projections.slice(1, 11).map((proj) => (
                      <td key={proj.id} className="px-4 py-2 text-center">
                        {formatCurrency(proj.freeCashFlow)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-green-50">
                    <td className="px-4 py-2 font-semibold">Flujo de Caja Libre FINAL</td>
                    {scenario.projections.slice(1, 11).map((proj) => (
                      <td key={proj.id} className="px-4 py-2 text-center font-semibold text-green-700">
                        {formatCurrency(proj.freeCashFlow || 0)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No hay proyecciones disponibles. Por favor, completa la Hoja 4.1 primero.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sección 2: PARÁMETROS */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">PARÁMETROS</h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {/* Fila 1: % WACC - CPPC */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  % WACC — CPPC (Coste Promedio Ponderado de Capital)
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-xs">
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={waccPct}
                        onChange={(e) => setWaccPct(parseFloat(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 text-right text-lg font-semibold outline-none bg-white"
                        placeholder="8"
                      />
                      <span className="px-3 py-2 bg-gray-100 text-gray-600 font-semibold border-l border-gray-300">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Ingresa el valor en porcentaje (ej: 8 = 8%)</p>
                  </div>
                  <div className="flex-1 text-xs text-gray-600">
                    <p className="font-medium mb-1">Fórmula WACC:</p>
                    <p className="text-[10px] bg-yellow-50 p-2 rounded border border-yellow-200">
                      = (Kd × (1−T) × %Deuda) + (Ke × %Equity)
                    </p>
                    <p className="mt-2">
                      WACC calculado desde componentes: <span className="font-semibold">{(calculatedWacc * 100).toFixed(2)}%</span>
                    </p>
                  </div>
                </div>

                {/* Parámetros auxiliares para cálculo WACC (colapsables) */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                    ► Ver/Editar componentes del WACC
                  </summary>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded border border-gray-200">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Coste de los Recursos Ajenos (Kd) %
                      </label>
                      <p className="text-[10px] text-gray-500 mb-2">Coste de la deuda antes de impuestos</p>
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={costOfDebtPct}
                          onChange={(e) => setCostOfDebtPct(parseFloat(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 text-right font-medium outline-none bg-white text-sm"
                        />
                        <span className="px-3 py-2 bg-gray-100 text-gray-600 font-semibold border-l border-gray-300 text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tasa Impositiva (T) %
                      </label>
                      <p className="text-[10px] text-gray-500 mb-2">% de impuestos sobre beneficios</p>
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={taxRatePct}
                          onChange={(e) => setTaxRatePct(parseFloat(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 text-right font-medium outline-none bg-white text-sm"
                        />
                        <span className="px-3 py-2 bg-gray-100 text-gray-600 font-semibold border-l border-gray-300 text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Coste de los Recursos Propios (Ke) %
                      </label>
                      <p className="text-[10px] text-gray-500 mb-2">Rentabilidad exigida por el accionista</p>
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={costOfEquityPct}
                          onChange={(e) => setCostOfEquityPct(parseFloat(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 text-right font-medium outline-none bg-white text-sm"
                        />
                        <span className="px-3 py-2 bg-gray-100 text-gray-600 font-semibold border-l border-gray-300 text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        % de Recursos Ajenos (D/V)
                      </label>
                      <p className="text-[10px] text-gray-500 mb-2">Proporción de financiación ajena sobre el total</p>
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={debtPct}
                          onChange={(e) => setDebtPct(parseFloat(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 text-right font-medium outline-none bg-white text-sm"
                        />
                        <span className="px-3 py-2 bg-gray-100 text-gray-600 font-semibold border-l border-gray-300 text-sm">%</span>
                      </div>
                    </div>
                    <div className="md:col-span-2 bg-white rounded p-3 border border-gray-200">
                      <p className="text-xs text-gray-600">
                        % de Recursos Propios (E/V): <span className="font-semibold text-blue-700">{(100 - debtPct).toFixed(1)}%</span>
                        <span className="text-[10px] ml-2 text-gray-500">(= 100% − %Deuda, calculado automáticamente)</span>
                      </p>
                    </div>
                  </div>
                </details>
              </div>

              {/* Fila 2: Tasa de Crecimiento */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Tasa de Crecimiento Perpetuo (g)
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-xs">
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={terminalGrowthPct}
                        onChange={(e) => setTerminalGrowthPct(parseFloat(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 text-right text-lg font-semibold outline-none bg-white"
                        placeholder="2"
                      />
                      <span className="px-3 py-2 bg-gray-100 text-gray-600 font-semibold border-l border-gray-300">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Ingresa el valor en porcentaje (ej: 2 = 2%)</p>
                  </div>
                  <div className="flex-1 text-xs text-gray-600">
                    <p className="bg-blue-50 p-2 rounded border border-blue-200">
                      Tasa interanual de crecimiento perpetuo a partir del último año proyectado.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fila 3: Periodo a Considerar */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Periodo a Considerar (años de proyección para DCF)
                </label>
                <div className="flex items-center gap-4">
                  <select
                    value={yearsToConsider}
                    onChange={(e) => setYearsToConsider(parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={5}>5 años</option>
                    <option value={6}>6 años</option>
                    <option value={7}>7 años</option>
                  </select>
                  <div className="flex-1 text-xs text-gray-600">
                    <p className="bg-green-50 p-2 rounded border border-green-200">
                      Este período afecta al cálculo del Valor Estimado en la sección VALORACIÓN.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 3: VALORACIÓN */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">VALORACIÓN</h3>
          </div>
          <div className="p-6">
            {valuationData ? (
              <div className="space-y-6">
                {/* Tabla de Flujos Descontados */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Detalle de Flujos de Caja Descontados (Años {yearsToConsider})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left border">Año</th>
                          <th className="px-4 py-2 text-right border">FCF</th>
                          <th className="px-4 py-2 text-right border">Factor Descuento</th>
                          <th className="px-4 py-2 text-right border">Valor Presente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {valuationData.discountedValues.map((item) => (
                          <tr key={item.year}>
                            <td className="px-4 py-2 border font-medium">{item.year}</td>
                            <td className="px-4 py-2 text-right border">{formatCurrency(item.fcf)}</td>
                            <td className="px-4 py-2 text-right border">{item.discountFactor.toFixed(6)}</td>
                            <td className="px-4 py-2 text-right border text-green-700 font-semibold">
                              {formatCurrency(item.pv)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-green-50 font-semibold">
                          <td colSpan={3} className="px-4 py-2 text-right border">
                            Suma VP de FCFs:
                          </td>
                          <td className="px-4 py-2 text-right border text-green-700">
                            {formatCurrency(valuationData.sumPvOfFCFs)}
                          </td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td colSpan={3} className="px-4 py-2 text-right border">
                            Valor Terminal (perpetuo):
                          </td>
                          <td className="px-4 py-2 text-right border text-blue-700 font-semibold">
                            {formatCurrency(valuationData.terminalValue)}
                          </td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td colSpan={3} className="px-4 py-2 text-right border">
                            VP del Valor Terminal:
                          </td>
                          <td className="px-4 py-2 text-right border text-blue-700 font-semibold">
                            {formatCurrency(valuationData.pvOfTerminalValue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Valor Estimado */}
                <div className="p-6 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg border-2 border-green-500">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    Valor Estimado de la Empresa
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700 mb-1">
                        Período: <span className="font-semibold">{yearsToConsider} años</span>
                      </p>
                      <p className="text-xs text-gray-600">
                        Enterprise Value = Σ VP FCFs + VP Valor Terminal
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-700">
                        {formatCurrency(valuationData.enterpriseValue)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        WACC: {formatPercent(wacc)} | g: {formatPercent(terminalGrowthRate)}
                      </p>
                    </div>
                  </div>

                  {/* Advertencia si WACC <= g */}
                  {wacc <= terminalGrowthRate && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                      <p className="text-sm text-red-800 font-semibold">
                        ⚠️ ADVERTENCIA: El WACC debe ser mayor que la tasa de crecimiento perpetuo (g).
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        WACC actual: {formatPercent(wacc)} | g actual: {formatPercent(terminalGrowthRate)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Fórmulas de Cálculo (Colapsable) */}
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                    ► Ver fórmulas de cálculo
                  </summary>
                  <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200 text-xs space-y-2">
                    <p>
                      <strong>Factor de Descuento:</strong> = 1 / (1 + WACC)^año
                    </p>
                    <p>
                      <strong>Valor Presente del FCF:</strong> = FCF × Factor de Descuento
                    </p>
                    <p>
                      <strong>Valor Terminal:</strong> = FCF último año × (1 + g) / (WACC - g)
                    </p>
                    <p>
                      <strong>VP Valor Terminal:</strong> = Valor Terminal / (1 + WACC)^{yearsToConsider}
                    </p>
                    <p>
                      <strong>Enterprise Value:</strong> = Σ VP de FCFs + VP Valor Terminal
                    </p>
                  </div>
                </details>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">Complete las proyecciones en la Hoja 4.1 para ver la valoración.</p>
                <p className="text-xs text-gray-400">
                  Necesitas al menos {yearsToConsider} años de proyecciones de Free Cash Flow.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save All Projections Button */}
      {scenarioId && (
        <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
          <Button
            onClick={handleSaveAll}
            disabled={saving}
            isLoading={saving}
            className="bg-green-600 hover:bg-green-700 text-white px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Todas las Proyecciones
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
};
