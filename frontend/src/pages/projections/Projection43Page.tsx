/**
 * Projection 4.3 Page
 * Valoración por DCF (Discounted Cash Flow) - Hoja 4.3 del Excel
 *
 * El WACC se obtiene automáticamente al cargar la página mediante IA,
 * ajustado al sector y país de la empresa. No es editable por el usuario.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import {
  projectionsService,
  type ProjectionScenarioWithData,
  type DCFResults,
} from '../../services/projections.service';
import { companyService } from '../../services/company.service';
import { toast } from 'sonner';
import { ArrowLeft, Calculator, DollarSign, Save, Sparkles } from 'lucide-react';
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
  const [companies, setCompanies] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [scenario, setScenario] = useState<ProjectionScenarioWithData | null>(null);
  const [_dcfResults, setDcfResults] = useState<DCFResults | null>(null);

  // DCF display values — set by AI, read-only
  const [waccPct, setWaccPct] = useState<number | null>(null);
  const [terminalGrowthPct, setTerminalGrowthPct] = useState<number | null>(null);
  const [costOfDebtPct, setCostOfDebtPct] = useState<number | null>(null);
  const [taxRatePct, setTaxRatePct] = useState<number | null>(null);
  const [costOfEquityPct, setCostOfEquityPct] = useState<number | null>(null);
  const [debtPct, setDebtPct] = useState<number | null>(null);

  // Period selector (only interactive field)
  const [yearsToConsider, setYearsToConsider] = useState<number>(5);

  // AI WACC estimation state
  const [estimatingWACC, setEstimatingWACC] = useState(false);
  const [waccExplanation, setWaccExplanation] = useState<string | null>(null);
  const [waccError, setWaccError] = useState<string | null>(null);

  // Prevent double-fetch on strict mode re-renders
  const waccFetchedRef = useRef(false);

  // ─── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (companyId) {
      loadData();
    } else {
      loadCompanies();
    }
    // Reset fetch guard when scenarioId changes
    waccFetchedRef.current = false;
  }, [companyId, scenarioId]);

  // Auto-fetch WACC from AI whenever we have a valid scenarioId
  useEffect(() => {
    if (!scenarioId || waccFetchedRef.current) return;
    waccFetchedRef.current = true;
    fetchWACCFromAI();
  }, [scenarioId]);

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

        // Pre-populate with previously saved WACC (shown while AI re-fetches)
        if (scenarioData.wacc != null) {
          setWaccPct(parseFloat((Number(scenarioData.wacc) * 100).toFixed(2)));
        }
        if (scenarioData.terminalGrowthRate != null) {
          setTerminalGrowthPct(parseFloat((Number(scenarioData.terminalGrowthRate) * 100).toFixed(2)));
        }

        if (scenarioData.wacc && scenarioData.enterpriseValue) {
          try {
            const results = await projectionsService.getDCFResults(scenarioId);
            setDcfResults(results);
          } catch {
            // No DCF results yet
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

  const fetchWACCFromAI = async () => {
    if (!scenarioId) return;
    try {
      setEstimatingWACC(true);
      setWaccError(null);
      const result = await projectionsService.estimateWACCWithAI(scenarioId);
      setWaccPct(parseFloat((result.wacc * 100).toFixed(2)));
      setTerminalGrowthPct(parseFloat((result.terminalGrowthRate * 100).toFixed(2)));
      setCostOfEquityPct(parseFloat((result.costOfEquity * 100).toFixed(2)));
      setCostOfDebtPct(parseFloat((result.costOfDebt * 100).toFixed(2)));
      setDebtPct(parseFloat((result.debtPercentage * 100).toFixed(1)));
      setTaxRatePct(parseFloat((result.taxRate * 100).toFixed(1)));
      setWaccExplanation(result.explanation);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'No se pudo estimar el WACC con IA.';
      setWaccError(msg);
      console.error('[WACC-AI]', msg);
    } finally {
      setEstimatingWACC(false);
    }
  };

  // ─── Save DCF parameters ───────────────────────────────────────────────────

  const handleSaveAll = async () => {
    if (waccPct == null || terminalGrowthPct == null) return;
    try {
      setSaving(true);
      await projectionsService.updateDCFParameters(scenarioId!, {
        wacc: waccPct / 100,
        costOfDebt: (costOfDebtPct ?? 0) / 100,
        taxRateForWacc: (taxRatePct ?? 0) / 100,
        terminalGrowthRate: terminalGrowthPct / 100,
        netDebt: 0,
      });
      await projectionsService.recalculateMetrics(scenarioId!);
      toast.success('Parámetros DCF guardados correctamente');
    } catch (error: any) {
      toast.error('Error al guardar los parámetros DCF');
    } finally {
      setSaving(false);
    }
  };

  // ─── Create scenario ───────────────────────────────────────────────────────

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
      if (newScenario?.id) {
        navigate(`/proyecciones?companyId=${companyId}&scenarioId=${newScenario.id}${viewParam}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al crear escenario');
    } finally {
      setSaving(false);
    }
  };

  // ─── Formatting helpers ────────────────────────────────────────────────────

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: company?.currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined, decimals = 2) => {
    if (value == null) return '-';
    return `${(value * 100).toFixed(decimals)}%`;
  };

  // ─── DCF calculations (use current state values) ───────────────────────────

  const wacc = (waccPct ?? 0) / 100;
  const terminalGrowthRate = (terminalGrowthPct ?? 0) / 100;

  const calculateDiscountedValues = () => {
    if (!scenario?.projections || wacc === 0) return [];
    const projs = scenario.projections.slice(1, yearsToConsider + 1);
    return projs.map((proj, index) => {
      const year = index + 1;
      const fcf = Number(proj.freeCashFlow) || 0;
      const discountFactor = 1 / Math.pow(1 + wacc, year);
      return { year: proj.year, yearIndex: year, fcf, discountFactor, pv: fcf * discountFactor };
    });
  };

  const calculateEnterpriseValue = () => {
    const dv = calculateDiscountedValues();
    if (dv.length === 0) return null;
    const sumPvOfFCFs = dv.reduce((s, i) => s + i.pv, 0);
    const lastFCF = dv[dv.length - 1].fcf;
    if (wacc <= terminalGrowthRate) return null; // invalid — shown as warning
    const terminalValue = (lastFCF * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate);
    const pvOfTerminalValue = terminalValue * dv[dv.length - 1].discountFactor;
    return { sumPvOfFCFs, terminalValue, pvOfTerminalValue, enterpriseValue: sumPvOfFCFs + pvOfTerminalValue, discountedValues: dv };
  };

  const valuationData = calculateEnterpriseValue();

  // ─── Shared read-only field component ─────────────────────────────────────

  const ReadOnlyValue: React.FC<{ value: number | null; suffix?: string; large?: boolean }> = ({ value, suffix = '%', large }) => (
    <div className={`flex items-center border border-purple-200 rounded-lg overflow-hidden bg-purple-50 ${large ? '' : ''}`}>
      <span className={`flex-1 px-3 py-2 text-right font-semibold text-purple-900 ${large ? 'text-lg' : 'text-sm'} select-none`}>
        {estimatingWACC
          ? <span className="inline-block w-12 h-4 bg-purple-200 rounded animate-pulse" />
          : value != null ? value.toFixed(large ? 2 : 2) : '—'}
      </span>
      <span className="px-3 py-2 bg-purple-100 text-purple-600 font-semibold border-l border-purple-200 text-sm">
        {suffix}
      </span>
    </div>
  );

  // ─── Loading screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  // ─── Company selection ─────────────────────────────────────────────────────

  if (!companyId) {
    return (
      <DashboardLayout>
        {tabsHeader}
        <div className="max-w-2xl mx-auto mt-16">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-6">
              <DollarSign className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Valoración DCF - Hoja 4.3</h2>
              <p className="text-gray-600">Selecciona una empresa para realizar valoración por Flujo de Caja Descontado</p>
            </div>
            <div className="space-y-3">
              {companies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tienes empresas creadas</p>
                  <Button onClick={() => navigate('/empresas')} className="mt-4">Crear primera empresa</Button>
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
                <ArrowLeft className="w-4 h-4 mr-2" />Volver al Dashboard
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Create scenario ───────────────────────────────────────────────────────

  if (!scenarioId) {
    return (
      <DashboardLayout>
        {tabsHeader}
        <div className="max-w-2xl mx-auto mt-16">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <DollarSign className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Valoración DCF - Hoja 4.3</h2>
            <p className="text-gray-600 mb-6">Crear proyección para valoración DCF de {company?.name}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-800 font-semibold mb-2">La Hoja 4.3 (DCF) incluye:</p>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>WACC calculado automáticamente con IA según sector y país</li>
                <li>Descuento de Free Cash Flows proyectados</li>
                <li>Cálculo del Valor Terminal (Gordon Growth Model)</li>
                <li>Enterprise Value y Equity Value</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/empresas')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />Volver
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

  // ─── Main DCF view ─────────────────────────────────────────────────────────

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
              <h1 className="text-2xl font-bold text-gray-900">Valoración DCF - Hoja 4.3</h1>
              <p className="text-gray-600">{company?.name} — {scenario?.name}</p>
            </div>
          </div>
        </div>

        {/* Sección 1: PROYECCIONES DE FLUJO DE CAJA */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">PROYECCIONES DE FLUJO DE CAJA</h3>
          </div>
          <div className="p-6 overflow-x-auto">
            {(scenario?.projections?.length ?? 0) > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-900">Concepto</th>
                    {scenario!.projections.slice(1, 11).map((proj) => (
                      <th key={proj.id} className="px-4 py-3 text-center font-medium text-gray-900">{proj.year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-4 py-2 font-medium">Flujo de Caja Libre Proyección</td>
                    {scenario!.projections.slice(1, 11).map((proj) => (
                      <td key={proj.id} className="px-4 py-2 text-center">{formatCurrency(proj.freeCashFlow)}</td>
                    ))}
                  </tr>
                  <tr className="bg-green-50">
                    <td className="px-4 py-2 font-semibold">Flujo de Caja Libre FINAL</td>
                    {scenario!.projections.slice(1, 11).map((proj) => (
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

        {/* Sección 2: PARÁMETROS — WACC obtenido por IA */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">PARÁMETROS</h3>
            {estimatingWACC && (
              <div className="flex items-center gap-2 text-white text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Consultando WACC de mercado con IA…
              </div>
            )}
          </div>
          <div className="p-6 space-y-6">

            {/* ── WACC principal ── */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                % WACC — CPPC (Coste Promedio Ponderado de Capital)
              </label>

              {/* AI explanation / loading banner */}
              {estimatingWACC && (
                <div className="mb-3 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-purple-800">
                      Consultando tasas de mercado con IA…
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Analizando tasa libre de riesgo, prima de mercado, beta sectorial y coste de deuda
                      para <strong>{company?.industry || 'este sector'}</strong> en <strong>{company?.country || 'el país de la empresa'}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {!estimatingWACC && waccExplanation && (
                <div className="mb-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs font-semibold text-purple-800 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    WACC calculado con IA — coincide con el informe generado
                  </p>
                  <p className="text-xs text-purple-700 leading-relaxed">{waccExplanation}</p>
                </div>
              )}

              {!estimatingWACC && waccError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-semibold text-red-700">⚠ No se pudo obtener el WACC con IA</p>
                  <p className="text-xs text-red-600 mt-1">{waccError}</p>
                  <p className="text-xs text-red-500 mt-1">
                    Verifica que la empresa tenga <strong>Sector/Industria</strong> y <strong>País</strong> configurados.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-6">
                <div className="flex-1 max-w-xs">
                  <ReadOnlyValue value={waccPct} large />
                  <p className="text-xs text-gray-400 mt-1">
                    Calculado automáticamente por IA al cargar la página
                  </p>
                </div>
                <div className="flex-1 text-xs text-gray-600">
                  <p className="font-medium mb-1">Fórmula WACC:</p>
                  <p className="text-[10px] bg-yellow-50 p-2 rounded border border-yellow-200">
                    = (Kd × (1−T) × %Deuda) + (Ke × %Equity)
                  </p>
                </div>
              </div>

              {/* Componentes del WACC — colapsable, solo lectura */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-purple-700 hover:text-purple-900">
                  ► Ver componentes del WACC estimados por IA
                </summary>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded border border-gray-200">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Coste de los Recursos Ajenos (Kd) %
                    </label>
                    <p className="text-[10px] text-gray-500 mb-2">Coste de la deuda antes de impuestos</p>
                    <ReadOnlyValue value={costOfDebtPct} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tasa Impositiva (T) %
                    </label>
                    <p className="text-[10px] text-gray-500 mb-2">% de impuestos sobre beneficios</p>
                    <ReadOnlyValue value={taxRatePct} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Coste de los Recursos Propios (Ke) %
                    </label>
                    <p className="text-[10px] text-gray-500 mb-2">Rentabilidad exigida por el accionista (CAPM)</p>
                    <ReadOnlyValue value={costOfEquityPct} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      % de Recursos Ajenos (D/V)
                    </label>
                    <p className="text-[10px] text-gray-500 mb-2">Proporción de deuda sobre capital total</p>
                    <ReadOnlyValue value={debtPct} />
                  </div>
                  <div className="md:col-span-2 bg-white rounded p-3 border border-gray-200">
                    <p className="text-xs text-gray-600">
                      % de Recursos Propios (E/V):{' '}
                      <span className="font-semibold text-purple-700">
                        {debtPct != null && !estimatingWACC ? `${(100 - debtPct).toFixed(1)}%` : '—'}
                      </span>
                      <span className="text-[10px] ml-2 text-gray-500">(= 100% − %Deuda)</span>
                    </p>
                  </div>
                </div>
              </details>
            </div>

            {/* ── Tasa de crecimiento perpetuo ── */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Tasa de Crecimiento Perpetuo (g)
              </label>
              <div className="flex items-center gap-6">
                <div className="flex-1 max-w-xs">
                  <ReadOnlyValue value={terminalGrowthPct} large />
                  <p className="text-xs text-gray-400 mt-1">Estimada por IA según sector y país</p>
                </div>
                <div className="flex-1 text-xs text-gray-600">
                  <p className="bg-blue-50 p-2 rounded border border-blue-200">
                    Tasa interanual de crecimiento perpetuo a partir del último año proyectado.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Periodo a considerar (único campo editable) ── */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Periodo a Considerar (años de proyección para DCF)
              </label>
              <div className="flex items-center gap-6">
                <select
                  value={yearsToConsider}
                  onChange={(e) => setYearsToConsider(parseInt(e.target.value))}
                  className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Sección 3: VALORACIÓN */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">VALORACIÓN</h3>
          </div>
          <div className="p-6">
            {estimatingWACC ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-gray-500">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
                <p className="text-sm">Calculando valoración con el WACC de mercado…</p>
              </div>
            ) : wacc > 0 && wacc <= terminalGrowthRate ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-semibold">
                  ⚠️ WACC ({formatPercent(wacc)}) debe ser mayor que la tasa de crecimiento perpetuo g ({formatPercent(terminalGrowthRate)}).
                </p>
              </div>
            ) : valuationData ? (
              <div className="space-y-6">
                {/* Tabla de flujos descontados */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Detalle de Flujos de Caja Descontados ({yearsToConsider} años)
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
                          <td colSpan={3} className="px-4 py-2 text-right border">Suma VP de FCFs:</td>
                          <td className="px-4 py-2 text-right border text-green-700">
                            {formatCurrency(valuationData.sumPvOfFCFs)}
                          </td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td colSpan={3} className="px-4 py-2 text-right border">Valor Terminal (perpetuo):</td>
                          <td className="px-4 py-2 text-right border text-blue-700 font-semibold">
                            {formatCurrency(valuationData.terminalValue)}
                          </td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td colSpan={3} className="px-4 py-2 text-right border">VP del Valor Terminal:</td>
                          <td className="px-4 py-2 text-right border text-blue-700 font-semibold">
                            {formatCurrency(valuationData.pvOfTerminalValue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Valor estimado */}
                <div className="p-6 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg border-2 border-green-500">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Valor Estimado de la Empresa</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700 mb-1">
                        Período: <span className="font-semibold">{yearsToConsider} años</span>
                      </p>
                      <p className="text-xs text-gray-600">Enterprise Value = Σ VP FCFs + VP Valor Terminal</p>
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
                </div>

                {/* Fórmulas colapsables */}
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                    ► Ver fórmulas de cálculo
                  </summary>
                  <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200 text-xs space-y-2">
                    <p><strong>Factor de Descuento:</strong> = 1 / (1 + WACC)^año</p>
                    <p><strong>Valor Presente del FCF:</strong> = FCF × Factor de Descuento</p>
                    <p><strong>Valor Terminal:</strong> = FCF último año × (1 + g) / (WACC − g)</p>
                    <p><strong>VP Valor Terminal:</strong> = Valor Terminal / (1 + WACC)^{yearsToConsider}</p>
                    <p><strong>Enterprise Value:</strong> = Σ VP de FCFs + VP Valor Terminal</p>
                  </div>
                </details>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">Complete las proyecciones en la Hoja 4.1 para ver la valoración.</p>
                <p className="text-xs text-gray-400">
                  Necesitas al menos {yearsToConsider} años de proyecciones de Free Cash Flow.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guardar parámetros */}
      {scenarioId && (
        <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
          <Button
            onClick={handleSaveAll}
            disabled={saving || estimatingWACC || waccPct == null}
            isLoading={saving}
            className="bg-green-600 hover:bg-green-700 text-white px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Parámetros DCF
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
};
