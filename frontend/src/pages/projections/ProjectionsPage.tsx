import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { projectionsService, type ProjectionScenarioWithData, type FinancialProjection } from '../../services/projections.service';
import { companyService } from '../../services/company.service';
import { toast } from 'sonner';
import { ArrowLeft, Save, TrendingUp, Settings, Calculator } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

interface ProjectionsPageProps {
  tabsHeader?: React.ReactNode;
}

export const ProjectionsPage: React.FC<ProjectionsPageProps> = ({ tabsHeader }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyId = searchParams.get('companyId');
  const scenarioId = searchParams.get('scenarioId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [scenario, setScenario] = useState<ProjectionScenarioWithData | null>(null);
  const [projections, setProjections] = useState<FinancialProjection[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGrowthRatesModal, setShowGrowthRatesModal] = useState(false);
  const [newYearsCount, setNewYearsCount] = useState(10);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, any>>>({});
  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;

  // Growth rates state
  const [growthRates, setGrowthRates] = useState({
    revenueGrowthRate: 0,
    costOfSalesGrowthRate: 0,
    otherOperatingExpensesGrowthRate: 0,
    depreciationGrowthRate: 0,
    exceptionalNetGrowthRate: 0,
  });

  // Funciones de formateo de números
  const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  };

  const parseFormattedNumber = (value: string): number => {
    if (!value) return 0;
    // Remover puntos de miles y reemplazar coma decimal por punto
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, scenarioId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar empresa
      const companyData = await companyService.getCompany(companyId!);
      setCompany(companyData);

      const sid = scenarioId;
      if (sid) {
        // Cargar escenario existente por ID
        const scenarioData = await projectionsService.getScenario(sid);
        setScenario(scenarioData);
        setProjections(scenarioData.projections);
        setNewYearsCount(scenarioData.projectionYears);
      } else {
        // Auto-cargar el escenario más reciente de la empresa
        const scenarios = await projectionsService.getCompanyScenarios(companyId!);
        if (scenarios.length > 0) {
          const latest = scenarios[0];
          setScenario(latest);
          setProjections(latest.projections || []);
          setNewYearsCount(latest.projectionYears);
          // Actualizar URL con el scenarioId para que persista en navegación
          const newParams = new URLSearchParams(searchParams);
          newParams.set('scenarioId', latest.id);
          navigate(`/proyecciones?${newParams.toString()}`, { replace: true });
        }
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };


  const handleUpdateProjection = (projectionId: string, field: string, value: any) => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setProjections((prev) =>
      prev.map((p) => (p.id === projectionId ? { ...p, [field]: numValue } : p))
    );
    setPendingChanges((prev) => ({
      ...prev,
      [projectionId]: { ...(prev[projectionId] || {}), [field]: numValue },
    }));
  };

  const handleSaveAll = async () => {
    if (!scenarioId) return;
    try {
      setSaving(true);
      await Promise.all(
        Object.entries(pendingChanges).map(([projId, changes]) =>
          projectionsService.updateProjection(projId, changes)
        )
      );
      setPendingChanges({});
      const refreshed = await projectionsService.getScenario(scenarioId!);
      setProjections(refreshed.projections || []);
      toast.success('Proyección guardada correctamente');
    } catch {
      toast.error('Error al guardar la proyección');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyGrowthRates = async () => {
    try {
      setSaving(true);
      await projectionsService.applyGrowthRates(scenarioId!, [growthRates] as any);
      toast.success('Tasas de crecimiento aplicadas');
      setShowGrowthRatesModal(false);
      loadData();
    } catch (error: any) {
      toast.error('Error al aplicar tasas de crecimiento');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateYearsCount = async () => {
    try {
      setSaving(true);
      await projectionsService.updateScenarioConfig(scenarioId!, {
        projectionYears: newYearsCount,
      });
      toast.success('Años de proyección actualizados');
      setShowConfigModal(false);
      loadData();
    } catch (error: any) {
      toast.error('Error al actualizar configuración');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: company?.currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <DashboardLayout>
        {tabsHeader}
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!scenarioId) {
    return (
      <DashboardLayout>
        {tabsHeader}
        <div className="max-w-lg mx-auto mt-12">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-7 h-7 text-slate-400" />
            </div>
            <h2 className="font-semibold text-slate-900 mb-1">Proyección Simplificada</h2>
            <p className="text-slate-500 text-sm mb-6">{company?.name}</p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-amber-800 mb-1 uppercase tracking-wide">Antes de continuar</p>
              <p className="text-amber-700 text-sm">
                Crea primero el escenario desde <strong>"Hoja 4.1 - Proyección Completa"</strong>. Luego podrás editarlo aquí.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/empresas')}>
                <ArrowLeft className="w-4 h-4" />
                Empresas
              </Button>
              <Button
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set('view', '4.1');
                  navigate(`/proyecciones?${p.toString()}`);
                }}
              >
                Ir a Hoja 4.1
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {tabsHeader}
      <div className="space-y-5">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/empresas')} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-data text-[10px] text-slate-400 tracking-[0.2em] uppercase">/ Proyecciones</span>
              </div>
              <h1 className="font-display text-2xl font-extrabold text-slate-900 leading-tight">
                {company?.name}
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">{scenario?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="font-data text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                SIN GUARDAR
              </span>
            )}
            <Button onClick={handleSaveAll} disabled={saving} size="sm" isLoading={saving} variant="secondary">
              <Save className="w-4 h-4" />
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button onClick={() => setShowGrowthRatesModal(true)} variant="outline" size="sm">
              <TrendingUp className="w-4 h-4" />
              Tasas
            </Button>
            <Button onClick={() => setShowConfigModal(true)} variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Info strip ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 px-4 py-2.5 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="font-data text-[10px] text-slate-400 uppercase tracking-wide">Año base</span>
            <span className="font-data text-sm font-medium text-slate-900">{scenario?.baseYear}</span>
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="font-data text-[10px] text-slate-400 uppercase tracking-wide">Proyectados</span>
            <span className="font-data text-sm font-medium text-slate-900">{scenario?.projectionYears} años</span>
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <p className="text-xs text-slate-400">EBIT, NOPAT, FCF se calculan automáticamente</p>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide sticky left-0 bg-slate-50 z-10">
                    Concepto
                  </th>
                  {projections.map((proj) => (
                    <th key={proj.year} className="px-4 py-3 text-center font-data text-xs font-medium text-slate-900 min-w-[140px]">
                      {proj.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* RESULTADOS Section */}
                <tr className="bg-slate-900">
                  <td colSpan={projections.length + 1} className="px-4 py-2 font-data text-[10px] font-medium text-amber-400 tracking-widest uppercase">
                    RESULTADOS
                  </td>
                </tr>

                {/* Ingresos por VENTAS */}
                <tr>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700 sticky left-0 bg-white">
                    Ingresos por VENTAS
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="text"
                        value={formatNumber(proj.revenue)}
                        onChange={(e) => {
                          const numValue = parseFormattedNumber(e.target.value);
                          handleUpdateProjection(proj.id, 'revenue', numValue);
                        }}
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-1.5 text-[10px] font-data text-slate-400 italic sticky left-0 bg-slate-50">
                    % variación anual
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={proj.revenueGrowthRate ? (Number(proj.revenueGrowthRate) * 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const percentValue = parseFloat(e.target.value) || 0;
                          const decimalValue = percentValue / 100;
                          handleUpdateProjection(proj.id, 'revenueGrowthRate', decimalValue);
                        }}
                        placeholder="0.00"
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>

                {/* Coste de las ventas */}
                <tr>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700 sticky left-0 bg-white">
                    Coste de las ventas
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="text"
                        value={formatNumber(proj.costOfSales)}
                        onChange={(e) => {
                          const numValue = parseFormattedNumber(e.target.value);
                          handleUpdateProjection(proj.id, 'costOfSales', numValue);
                        }}
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-1.5 text-[10px] font-data text-slate-400 italic sticky left-0 bg-slate-50">
                    % variación anual
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={proj.costOfSalesGrowthRate ? (Number(proj.costOfSalesGrowthRate) * 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const percentValue = parseFloat(e.target.value) || 0;
                          const decimalValue = percentValue / 100;
                          handleUpdateProjection(proj.id, 'costOfSalesGrowthRate', decimalValue);
                        }}
                        placeholder="0.00"
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>

                {/* Otros gastos explotación */}
                <tr>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700 sticky left-0 bg-white">
                    Otros gastos explotación
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="text"
                        value={formatNumber(proj.otherOperatingExpenses)}
                        onChange={(e) => {
                          const numValue = parseFormattedNumber(e.target.value);
                          handleUpdateProjection(proj.id, 'otherOperatingExpenses', numValue);
                        }}
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-1.5 text-[10px] font-data text-slate-400 italic sticky left-0 bg-slate-50">
                    % variación anual
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={proj.otherOperatingExpensesGrowthRate ? (Number(proj.otherOperatingExpensesGrowthRate) * 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const percentValue = parseFloat(e.target.value) || 0;
                          const decimalValue = percentValue / 100;
                          handleUpdateProjection(proj.id, 'otherOperatingExpensesGrowthRate', decimalValue);
                        }}
                        placeholder="0.00"
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>

                {/* Depreciaciones */}
                <tr>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700 sticky left-0 bg-white">
                    Depreciaciones (Amortizaciones)
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="text"
                        value={formatNumber(proj.depreciation)}
                        onChange={(e) => {
                          const numValue = parseFormattedNumber(e.target.value);
                          handleUpdateProjection(proj.id, 'depreciation', numValue);
                        }}
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-1.5 text-[10px] font-data text-slate-400 italic sticky left-0 bg-slate-50">
                    % variación anual
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={proj.depreciationGrowthRate ? (Number(proj.depreciationGrowthRate) * 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const percentValue = parseFloat(e.target.value) || 0;
                          const decimalValue = percentValue / 100;
                          handleUpdateProjection(proj.id, 'depreciationGrowthRate', decimalValue);
                        }}
                        placeholder="0.00"
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>

                {/* Excepcionales Netos */}
                <tr>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700 sticky left-0 bg-white">
                    Excepcionales Netos (+ -)
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="text"
                        value={formatNumber(proj.exceptionalNet)}
                        onChange={(e) => {
                          const numValue = parseFormattedNumber(e.target.value);
                          handleUpdateProjection(proj.id, 'exceptionalNet', numValue);
                        }}
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-1.5 text-[10px] font-data text-slate-400 italic sticky left-0 bg-slate-50">
                    % variación anual
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={proj.exceptionalNetGrowthRate ? (Number(proj.exceptionalNetGrowthRate) * 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const percentValue = parseFloat(e.target.value) || 0;
                          const decimalValue = percentValue / 100;
                          handleUpdateProjection(proj.id, 'exceptionalNetGrowthRate', decimalValue);
                        }}
                        placeholder="0.00"
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>

                {/* Calculated Values */}
                <tr className="bg-amber-50/60">
                  <td className="px-4 py-2.5 font-semibold text-slate-800 text-xs sticky left-0 bg-amber-50/60">
                    B.A.I.I. — EBIT
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-4 py-2.5 text-right font-data text-xs font-medium text-slate-800">
                      {formatCurrency(proj.ebit)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-amber-50/60">
                  <td className="px-4 py-2.5 font-semibold text-slate-800 text-xs sticky left-0 bg-amber-50/60">
                    NOPAT — B. Operativo Neto
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-4 py-2.5 text-right font-data text-xs font-medium text-slate-800">
                      {formatCurrency(proj.nopat)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-amber-50/60">
                  <td className="px-4 py-2.5 font-semibold text-slate-800 text-xs sticky left-0 bg-amber-50/60">
                    Flujo de caja bruto
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-4 py-2.5 text-right font-data text-xs font-medium text-slate-800">
                      {formatCurrency(proj.grossCashFlow)}
                    </td>
                  ))}
                </tr>

                {/* INVERSIÓN Section */}
                <tr className="bg-slate-900">
                  <td colSpan={projections.length + 1} className="px-4 py-2 font-data text-[10px] font-medium text-amber-400 tracking-widest uppercase">
                    INVERSIÓN ACTIVO OPERATIVO
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700 sticky left-0 bg-white">
                    Inversión en activo circulante
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="text"
                        value={formatNumber(proj.workingCapitalInvestment)}
                        onChange={(e) => {
                          const numValue = parseFormattedNumber(e.target.value);
                          handleUpdateProjection(proj.id, 'workingCapitalInvestment', numValue);
                        }}
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700 sticky left-0 bg-white">
                    Inversión en activo fijo
                  </td>
                  {projections.map((proj) => (
                    <td key={proj.id} className="px-2 py-2">
                      <Input
                        type="text"
                        value={formatNumber(proj.fixedAssetsInvestment)}
                        onChange={(e) => {
                          const numValue = parseFormattedNumber(e.target.value);
                          handleUpdateProjection(proj.id, 'fixedAssetsInvestment', numValue);
                        }}
                        className="text-right text-sm"
                      />
                    </td>
                  ))}
                </tr>

                {/* FREE CASH FLOW */}
                <tr className="bg-slate-900">
                  <td className="px-4 py-3 font-data text-xs font-semibold text-amber-400 sticky left-0 bg-slate-900 tracking-wide">
                    FCF — Flujo de caja libre
                  </td>
                  {projections.map((proj) => {
                    const fcf = (proj.grossCashFlow ?? 0)
                      - (proj.workingCapitalInvestment ?? 0)
                      - (proj.fixedAssetsInvestment ?? 0);
                    return (
                      <td key={proj.id} className="px-4 py-3 text-right font-data text-xs font-semibold text-amber-400">
                        {formatCurrency(fcf)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Aplicar Tasas de Crecimiento */}
      <Modal
        isOpen={showGrowthRatesModal}
        onClose={() => setShowGrowthRatesModal(false)}
        title="Aplicar Tasas de Crecimiento"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Las tasas se aplicarán a partir del año base de forma compuesta
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasa de crecimiento de Ingresos (%)
            </label>
            <Input
              type="number"
              step="0.1"
              value={growthRates.revenueGrowthRate}
              onChange={(e) =>
                setGrowthRates({ ...growthRates, revenueGrowthRate: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasa de crecimiento de Coste de Ventas (%)
            </label>
            <Input
              type="number"
              step="0.1"
              value={growthRates.costOfSalesGrowthRate}
              onChange={(e) =>
                setGrowthRates({ ...growthRates, costOfSalesGrowthRate: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasa de crecimiento de Gastos Explotación (%)
            </label>
            <Input
              type="number"
              step="0.1"
              value={growthRates.otherOperatingExpensesGrowthRate}
              onChange={(e) =>
                setGrowthRates({
                  ...growthRates,
                  otherOperatingExpensesGrowthRate: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasa de crecimiento de Depreciaciones (%)
            </label>
            <Input
              type="number"
              step="0.1"
              value={growthRates.depreciationGrowthRate}
              onChange={(e) =>
                setGrowthRates({ ...growthRates, depreciationGrowthRate: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasa de crecimiento de Excepcionales (%)
            </label>
            <Input
              type="number"
              step="0.1"
              value={growthRates.exceptionalNetGrowthRate}
              onChange={(e) =>
                setGrowthRates({ ...growthRates, exceptionalNetGrowthRate: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowGrowthRatesModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyGrowthRates} disabled={saving}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Aplicar Tasas
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Configurar Años */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Configurar Proyección"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de años a proyectar
            </label>
            <Input
              type="number"
              min="1"
              max="20"
              value={newYearsCount}
              onChange={(e) => setNewYearsCount(parseInt(e.target.value) || 10)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Actual: {scenario?.projectionYears} años
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateYearsCount} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};
