import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Save, Building2, Plus, Trash2 } from 'lucide-react';
import { companyService } from '../../services/company.service';
import { financialService } from '../../services/financial.service';
import { useCompanyStore } from '../../store/companyStore';
import { CompanySelector } from '../../components/companies/CompanySelector';
import type { Company } from '../../types/company';
import type {
  CreateBalanceSheetData,
  CreateIncomeStatementData,
  CreateCashFlowData,
  CreateAdditionalDataData,
} from '../../types/financial';

interface YearData {
  year: number;
  fiscalYearId: string;
  balance: CreateBalanceSheetData;
  income: CreateIncomeStatementData;
  cashflow: CreateCashFlowData;
  additional: CreateAdditionalDataData;
}

// Funciones de formateo de números
const formatNumber = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('es-ES', { maximumFractionDigits: 0 });
};

const unformatNumber = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/\./g, '');
  const num = parseInt(cleaned);
  return isNaN(num) ? 0 : num;
};

const TABS = [
  { id: 'balance', name: 'Balance de Situación' },
  { id: 'income', name: 'Pérdidas y Ganancias' },
  { id: 'additional', name: 'Datos Adicionales' },
];

export const MultiYearDataEntryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyId = searchParams.get('companyId');
  const setSelectedCompanyInStore = useCompanyStore((state) => state.setSelectedCompany);

  const [company, setCompany] = useState<Company | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('balance');

  // Array de datos por año
  const [yearDataList, setYearDataList] = useState<YearData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Estados para modales
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [showRemoveYearModal, setShowRemoveYearModal] = useState(false);
  const [yearToRemove, setYearToRemove] = useState<number | null>(null);
  const [newYearInput, setNewYearInput] = useState('');

  useEffect(() => {
    loadAvailableCompanies();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadCompanyData();
    }
  }, [companyId]);

  const loadAvailableCompanies = async () => {
    try {
      const companies = await companyService.getCompanies();
      setAvailableCompanies(companies);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadCompanyData = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const companyData = await companyService.getCompany(companyId);
      setCompany(companyData);
      setSelectedCompanyInStore(companyData);

      // Obtener años fiscales existentes
      const fiscalYears = await financialService.getFiscalYears(companyId);

      // Si no hay años, crear uno usando el año base de la empresa
      if (fiscalYears.length === 0) {
        const defaultYear = companyData.baseYear || new Date().getFullYear();
        const newYear = await financialService.createFiscalYear(companyId, {
          year: defaultYear,
        });
        fiscalYears.push(newYear);
      }

      // Ordenar años de más reciente a más antiguo (columna izquierda = año más reciente)
      fiscalYears.sort((a, b) => b.year - a.year);

      // Cargar datos de cada año
      const dataPromises = fiscalYears.map(async (fy) => {
        const [balance, income, cashflow, additional] = await Promise.all([
          financialService.getBalanceSheet(fy.id).catch(() => ({})),
          financialService.getIncomeStatement(fy.id).catch(() => ({})),
          financialService.getCashFlow(fy.id).catch(() => ({})),
          financialService.getAdditionalData(fy.id).catch(() => ({})),
        ]);

        return {
          year: fy.year,
          fiscalYearId: fy.id,
          balance: balance || {},
          income: income || {},
          cashflow: cashflow || {},
          additional: additional || {},
        };
      });

      const loadedData = await Promise.all(dataPromises);
      setYearDataList(loadedData);
      setAvailableYears(loadedData.map(d => d.year));
    } catch (error) {
      console.error('Error loading company:', error);
      alert('Error al cargar la empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleAddYear = () => {
    if (!companyId) return;

    // Validar máximo 5 años
    if (availableYears.length >= 5) {
      alert('Has alcanzado el máximo de 5 años permitidos.\nPara agregar un nuevo año, primero debes eliminar uno existente.');
      return;
    }

    setNewYearInput('');
    setShowAddYearModal(true);
  };

  const confirmAddYear = async () => {
    if (!companyId) return;

    const newYear = parseInt(newYearInput);

    // Validaciones
    if (isNaN(newYear) || newYear < 1900 || newYear > 2100) {
      alert('Por favor ingrese un año válido entre 1900 y 2100');
      return;
    }

    if (availableYears.includes(newYear)) {
      alert(`El año ${newYear} ya existe.`);
      return;
    }

    // Validar que sea consecutivo
    if (availableYears.length > 0) {
      const minYear = Math.min(...availableYears);
      const maxYear = Math.max(...availableYears);
      const validYears = [minYear - 1, maxYear + 1];

      if (!validYears.includes(newYear)) {
        alert(`El año debe ser consecutivo.\nSolo puede agregar: ${minYear - 1} o ${maxYear + 1}`);
        return;
      }
    }

    try {
      setSaving(true);
      setShowAddYearModal(false);

      const fiscalYear = await financialService.createFiscalYear(companyId, {
        year: newYear,
      });

      const newYearData: YearData = {
        year: newYear,
        fiscalYearId: fiscalYear.id,
        balance: {},
        income: {},
        cashflow: {},
        additional: {},
      };

      // Agregar y ordenar los años (más reciente primero)
      const updatedYearDataList = [...yearDataList, newYearData].sort((a, b) => b.year - a.year);
      const updatedAvailableYears = [...availableYears, newYear].sort((a, b) => b - a);

      setYearDataList(updatedYearDataList);
      setAvailableYears(updatedAvailableYears);
    } catch (error) {
      console.error('Error adding year:', error);
      alert('Error al agregar año');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveYear = (year: number) => {
    if (yearDataList.length <= 1) {
      alert('Debe mantener al menos un año');
      return;
    }

    // Validar que solo se pueda eliminar el primer o último año
    const minYear = Math.min(...availableYears);
    const maxYear = Math.max(...availableYears);

    if (year !== minYear && year !== maxYear) {
      alert(`Solo puede eliminar el primer (${minYear}) o último (${maxYear}) año de la secuencia.\nNo puede eliminar años intermedios para mantener la consecutividad.`);
      return;
    }

    setYearToRemove(year);
    setShowRemoveYearModal(true);
  };

  const confirmRemoveYear = () => {
    if (yearToRemove === null) return;

    setYearDataList(yearDataList.filter(yd => yd.year !== yearToRemove));
    setAvailableYears(availableYears.filter(y => y !== yearToRemove));
    setShowRemoveYearModal(false);
    setYearToRemove(null);
  };

  const updateYearData = (year: number, section: 'balance' | 'income' | 'cashflow' | 'additional', field: string, value: string) => {
    setYearDataList(prevYearDataList => {
      return prevYearDataList.map(yd => {
        if (yd.year === year) {
          const updatedValue = value === '' ? undefined : unformatNumber(value);
          const updatedYearData = {
            ...yd,
            [section]: {
              ...yd[section],
              [field]: updatedValue,
            },
          };

          // Sincronizar Existencias con Existencias PROMEDIO
          if (section === 'balance' && field === 'inventory') {
            updatedYearData.additional = {
              ...updatedYearData.additional,
              averageInventory: updatedValue,
            };
          }

          // Calcular Compras automáticamente
          // Fórmula: Compras = Existencias_actual + Existencias_anterior + Coste_ventas
          // (En Excel el Coste de ventas es negativo, pero el usuario lo ingresa positivo)
          // Fórmula Excel: =+G16+H16-G49 donde G49 es negativo, equivale a sumar
          const shouldCalculatePurchases =
            (section === 'balance' && field === 'inventory') ||
            (section === 'income' && field === 'costOfSales');

          if (shouldCalculatePurchases) {
            const currentInventory = section === 'balance' && field === 'inventory'
              ? Number(updatedValue || 0)
              : Number(updatedYearData.balance.inventory || 0);

            const currentCostOfSales = section === 'income' && field === 'costOfSales'
              ? Number(updatedValue || 0)
              : Number(updatedYearData.income.costOfSales || 0);

            // Buscar el año anterior
            const previousYearData = prevYearDataList.find(y => y.year === year - 1);
            const previousInventory = previousYearData ? Number(previousYearData.balance.inventory || 0) : 0;

            // Calcular Compras
            // Usuario ingresa valores positivos, pero internamente el Coste de ventas es negativo
            // Por eso sumamos: Existencias + Existencias_anterior + Coste_ventas
            const purchases = currentInventory + previousInventory + currentCostOfSales;

            updatedYearData.additional = {
              ...updatedYearData.additional,
              purchases: purchases > 0 ? purchases : undefined,
            };
          }

          return updatedYearData;
        }
        return yd;
      });
    });
  };

  const handleSaveAll = async () => {
    if (!companyId) return;

    try {
      setSaving(true);

      // Guardar todos los años en paralelo
      const savePromises = yearDataList.map(async (yearData) => {
        await Promise.all([
          financialService.createOrUpdateBalanceSheet(yearData.fiscalYearId, yearData.balance),
          financialService.createOrUpdateIncomeStatement(yearData.fiscalYearId, yearData.income),
          financialService.createOrUpdateCashFlow(yearData.fiscalYearId, yearData.cashflow),
          financialService.createOrUpdateAdditionalData(yearData.fiscalYearId, yearData.additional),
        ]);
      });

      await Promise.all(savePromises);
      alert('Datos guardados exitosamente');
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  if (!companyId) {
    return (
      <CompanySelector
        companies={availableCompanies}
        onSelect={(company) => navigate(`/datos?companyId=${company.id}`)}
        title="Ingreso de Datos Financieros"
        description="Selecciona una empresa para ingresar sus datos financieros"
        icon={<Building2 className="w-7 h-7 text-slate-900" />}
      />
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando datos...</p>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-full mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Datos Financieros Multi-Año
              </h1>
              <p className="text-gray-600">{company?.name}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAddYear} variant="outline" disabled={saving}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Año
              </Button>
              <Button onClick={handleSaveAll} disabled={saving} isLoading={saving}>
                <Save className="w-4 h-4 mr-2" />
                Guardar Todo
              </Button>
            </div>
          </div>

          {/* Advertencia sobre cantidad de años */}
          {yearDataList.length < 3 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                  {yearDataList.length === 1
                    ? '⚠️ Solo 1 año de datos'
                    : `⚠️ Solo ${yearDataList.length} años de datos`}
                </h4>
                <p className="text-xs text-yellow-800">
                  Para un análisis financiero completo, se recomienda tener entre <strong>3 y 5 años de datos</strong>.
                  Con {yearDataList.length} {yearDataList.length === 1 ? 'año' : 'años'}:
                </p>
                <ul className="text-xs text-yellow-800 mt-2 ml-4 list-disc space-y-1">
                  <li>Los ratios individuales se calcularán correctamente</li>
                  <li>El informe se generará sin problemas</li>
                  {yearDataList.length === 1 && <li className="font-semibold">⚠️ No habrá análisis de tendencias (requiere mínimo 2 años)</li>}
                  {yearDataList.length < 3 && <li className="font-semibold">⚠️ Análisis de tendencias limitado (óptimo: 3-5 años)</li>}
                  <li>Algunos análisis comparativos tendrán menos contexto</li>
                </ul>
                <p className="text-xs text-yellow-800 mt-2 font-medium">
                  💡 Recomendación: Agregue entre {3 - yearDataList.length} y {5 - yearDataList.length} años más para un análisis completo (máximo: 5 años).
                </p>
              </div>
            </div>
          )}

          {yearDataList.length >= 3 && yearDataList.length < 5 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  ✓ Cantidad de años aceptable ({yearDataList.length} años)
                </h4>
                <p className="text-xs text-blue-800">
                  Tiene suficientes datos para un buen análisis. Para resultados óptimos, considere agregar {5 - yearDataList.length} año{5 - yearDataList.length > 1 ? 's' : ''} más (máximo: 5 años).
                </p>
              </div>
            </div>
          )}

          {yearDataList.length === 5 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-green-900 mb-1">
                  ✓ Máximo alcanzado (5 años)
                </h4>
                <p className="text-xs text-green-800">
                  Excelente! Has alcanzado el máximo de 5 años de datos. Esto permite realizar análisis de tendencias completos y obtener insights financieros precisos. Para agregar un año diferente, primero debes eliminar uno existente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex -mb-px space-x-8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-amber-600 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <Card>
          <div className="overflow-x-auto">
            {activeTab === 'balance' && (
              <BalanceSheetTable
                yearDataList={yearDataList}
                onUpdate={updateYearData}
                onRemoveYear={handleRemoveYear}
                currency={company?.currency || 'EUR'}
              />
            )}
            {activeTab === 'income' && (
              <IncomeStatementTable
                yearDataList={yearDataList}
                onUpdate={updateYearData}
                onRemoveYear={handleRemoveYear}
                currency={company?.currency || 'EUR'}
              />
            )}
            {activeTab === 'additional' && (
              <AdditionalDataTable
                yearDataList={yearDataList}
                onUpdate={updateYearData}
                onRemoveYear={handleRemoveYear}
                currency={company?.currency || 'EUR'}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Modal para agregar año */}
      {showAddYearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-amber-50 rounded-full mb-4">
                <Plus className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Agregar Año Comercial
              </h3>

              <p className="text-sm text-gray-600 text-center mb-4">
                Los años deben ser consecutivos (máximo 5 años)
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Año comercial
                </label>
                <input
                  type="number"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      confirmAddYear();
                    }
                  }}
                  placeholder="Ej: 2020"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center text-lg font-semibold"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddYearModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAddYear}
                  disabled={!newYearInput}
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para eliminar año */}
      {showRemoveYearModal && yearToRemove !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Eliminar Año Fiscal
              </h3>
              <p className="text-gray-600 text-center mb-6">
                ¿Está seguro de eliminar los datos del año <span className="font-bold text-red-600">{yearToRemove}</span>?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-yellow-800 text-center">
                  ⚠️ Esta acción no se puede deshacer
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRemoveYearModal(false);
                    setYearToRemove(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmRemoveYear}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

// ==================== BALANCE SHEET TABLE ====================
interface TableProps {
  yearDataList: YearData[];
  onUpdate: (year: number, section: 'balance' | 'income' | 'cashflow' | 'additional', field: string, value: string) => void;
  onRemoveYear: (year: number) => void;
  currency: string;
}

const BalanceSheetTable: React.FC<TableProps> = ({ yearDataList, onUpdate, onRemoveYear }) => {
  const balanceFields = [
    // ACTIVO
    { section: 'ACTIVO', isBold: true, bgClass: 'bg-gray-200' },
    { section: 'A) ACTIVO FIJO', isBold: true, bgClass: 'bg-blue-100' },
    { label: 'Activo Fijo - Depreciación Acumulada', field: 'tangibleAssets', indent: true },
    { label: 'Otros Activos', field: 'intangibleAssets', indent: true },
    { label: 'Inversiones financieras LP', field: 'financialInvestmentsLp', indent: true },

    { section: 'B) ACTIVO CIRCULANTE', isBold: true, bgClass: 'bg-green-100' },
    { label: 'Existencias', field: 'inventory', indent: true },
    { subsection: 'Realizable', indent: true },
    { label: 'Clientes - Realizable CP', field: 'accountsReceivable', indent: true, doubleIndent: true },
    { label: 'Otros - Realizable CP', field: 'otherReceivables', indent: true, doubleIndent: true },
    { label: 'Impuestos - Realizable CP', field: 'taxReceivables', indent: true, doubleIndent: true },
    { label: 'Disponible', field: 'cashEquivalents', indent: true },

    { section: 'TOTAL ACTIVO (A+B)', isBold: true, bgClass: 'bg-blue-200', isCalculated: true },

    // PATRIMONIO NETO Y PASIVO
    { section: 'PATRIMONIO NETO Y PASIVO', isBold: true, bgClass: 'bg-gray-200', isPassive: true },
    { label: 'A) PATRIMONIO NETO', field: 'shareCapital', isBold: true, bgClass: 'bg-blue-100', isPassive: true },

    { section: 'B) PASIVO NO CIRCULANTE', isBold: true, bgClass: 'bg-orange-100', isPassive: true },
    { label: 'Provisiones LP', field: 'provisionsLp', indent: true },
    { label: 'Deudas Largo Plazo', field: 'bankDebtLp', indent: true },
    { label: 'Otras Largo Plazo', field: 'otherLiabilitiesLp', indent: true },

    { section: 'C) PASIVO CIRCULANTE', isBold: true, bgClass: 'bg-red-100', isPassive: true },
    { label: 'Provisiones CP', field: 'provisionsSp', indent: true },
    { label: 'Deudas Corto Plazo', field: 'bankDebtSp', indent: true },
    { label: 'Proveedores Corto Plazo', field: 'accountsPayable', indent: true },
    { label: 'Impuestos P - Corto Plazo', field: 'taxLiabilities', indent: true },
    { label: 'Otras a Pagar Corto Plazo', field: 'otherLiabilitiesSp', indent: true },

    { section: 'TOTAL PATRIMONIO NETO Y PASIVO (A+B+C)', isBold: true, bgClass: 'bg-blue-200', isPassive: true, isCalculated: true },

    { section: 'CUADRATURA', isBold: true, bgClass: '', isCuadratura: true },
  ];

  // Calcula el Total Activo para un año
  function calcTotalActivo(balance: CreateBalanceSheetData): number {
    const activoNC = Number(balance.tangibleAssets || 0) + Number(balance.intangibleAssets || 0) +
                     Number(balance.financialInvestmentsLp || 0) + Number(balance.otherNoncurrentAssets || 0);
    const activoC  = Number(balance.inventory || 0) + Number(balance.accountsReceivable || 0) +
                     Number(balance.otherReceivables || 0) + Number(balance.taxReceivables || 0) +
                     Number(balance.cashEquivalents || 0);
    return activoNC + activoC;
  }

  // Calcula el Total Patrimonio Neto + Pasivo para un año
  function calcTotalPasivoPatrimonio(balance: CreateBalanceSheetData): number {
    const patrimonioNeto = Number(balance.shareCapital || 0) + Number(balance.reserves || 0) +
                           Number(balance.retainedEarnings || 0) - Number(balance.treasuryStock || 0);
    const pasivoNC = Number(balance.provisionsLp || 0) + Number(balance.bankDebtLp || 0) +
                     Number(balance.otherLiabilitiesLp || 0);
    const pasivoC  = Number(balance.provisionsSp || 0) + Number(balance.bankDebtSp || 0) +
                     Number(balance.accountsPayable || 0) + Number(balance.taxLiabilities || 0) +
                     Number(balance.otherLiabilitiesSp || 0);
    return patrimonioNeto + pasivoNC + pasivoC;
  }

  // Función auxiliar para calcular totales en la tabla
  function calculateTotal(yearData: YearData, row: any): string {
    const balance = yearData.balance;
    if (row.section === 'TOTAL ACTIVO (A+B)') return formatNumber(calcTotalActivo(balance));
    if (row.section === 'TOTAL PATRIMONIO NETO Y PASIVO (A+B+C)') return formatNumber(calcTotalPasivoPatrimonio(balance));
    return '';
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 min-w-[300px]">
            Balance de Situación
          </th>
          {yearDataList.map((yearData) => (
            <th key={yearData.year} className="px-4 py-3 text-center min-w-[150px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase">{yearData.year}</span>
                {yearDataList.length > 1 && (
                  <button
                    onClick={() => onRemoveYear(yearData.year)}
                    className="text-red-500 hover:text-red-700"
                    title="Eliminar año"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {balanceFields.map((row, index) => {
          const indentClass = row.doubleIndent ? 'pl-12' : row.indent ? 'pl-8' : '';

          // ── Fila especial: CUADRATURA ──
          if (row.isCuadratura) {
            const allBalanced = yearDataList.every((yd) => {
              const diff = calcTotalActivo(yd.balance) - calcTotalPasivoPatrimonio(yd.balance);
              return Math.abs(diff) < 1;
            });
            return (
              <tr key={index} className={allBalanced ? 'bg-green-100' : 'bg-red-100'}>
                <td className={`px-4 py-3 text-sm font-bold sticky left-0 z-10 ${allBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {allBalanced ? '✓ CUADRATURA' : '⚠ CUADRATURA'}
                  <span className="block text-xs font-normal mt-0.5">
                    {allBalanced ? 'Total Activo = Pasivo + Patrimonio Neto' : 'Total Activo ≠ Pasivo + Patrimonio Neto'}
                  </span>
                </td>
                {yearDataList.map((yearData) => {
                  const totalActivo = calcTotalActivo(yearData.balance);
                  const totalPasivo = calcTotalPasivoPatrimonio(yearData.balance);
                  const diff = totalActivo - totalPasivo;
                  const balanced = Math.abs(diff) < 1;
                  return (
                    <td
                      key={yearData.year}
                      className={`px-4 py-3 text-center font-bold text-sm ${balanced ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {balanced ? (
                        <span className="inline-flex items-center gap-1">
                          <span>✓ Cuadrado</span>
                        </span>
                      ) : (
                        <span className="inline-flex flex-col items-center gap-0.5">
                          <span>✗ Descuadrado</span>
                          <span className="text-xs font-normal">
                            Diferencia: {formatNumber(Math.abs(diff))}
                          </span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          }

          return (
            <tr key={index} className={row.bgClass || (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
              <td className={`px-4 py-2 text-sm sticky left-0 z-10 ${row.bgClass || (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')} ${row.isBold ? 'font-semibold' : ''} ${indentClass}`}>
                {row.section || row.subsection || row.label}
              </td>
              {row.section || row.subsection || row.isCalculated ? (
                yearDataList.map((yearData) => (
                  <td key={yearData.year} className="px-4 py-2 text-right font-semibold">
                    {row.isCalculated ? calculateTotal(yearData, row) : ''}
                  </td>
                ))
              ) : (
                yearDataList.map((yearData) => (
                  <td key={yearData.year} className="px-4 py-2">
                    <input
                      type="text"
                      value={formatNumber(yearData.balance[row.field as keyof CreateBalanceSheetData])}
                      onChange={(e) => onUpdate(yearData.year, 'balance', row.field!, e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </td>
                ))
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ==================== INCOME STATEMENT TABLE ====================
const IncomeStatementTable: React.FC<TableProps> = ({ yearDataList, onUpdate, onRemoveYear }) => {
  const incomeFields = [
    { section: 'CUENTA DE PÉRDIDAS Y GANANCIAS', isBold: true, bgClass: 'bg-gray-200' },

    { subsection: 'Ingresos por Ventas', bgClass: 'bg-green-50' },
    { label: 'Ingresos por ventas (+)', field: 'revenue', indent: true },

    { subsection: 'Coste de las ventas', bgClass: 'bg-red-50' },
    { label: 'Coste de las ventas (-)', field: 'costOfSales', indent: true },
    { label: 'Remuneraciones (CVentas) (-)', field: 'staffCostsSales', indent: true },

    { subsection: 'Gastos de administración', bgClass: 'bg-orange-50' },
    { label: 'Gastos administración (-)', field: 'adminExpenses', indent: true },
    { label: 'Remuneraciones (CAdmin) (-)', field: 'staffCostsAdmin', indent: true },
    { label: 'Depreciaciones (-)', field: 'depreciation', indent: true },

    { section: 'Resultado de explotación', isBold: true, bgClass: 'bg-green-200', isCalculated: true },

    { label: 'Ingresos excepcionales (+)', field: 'exceptionalIncome', indent: true },
    { label: 'Gastos excepcionales (-)', field: 'exceptionalExpenses', indent: true },

    { section: 'Resultado excepcional', isBold: true, bgClass: 'bg-yellow-200', isCalculated: true },

    { label: 'Ingresos financieros (+)', field: 'financialIncome', indent: true },
    { label: 'Gastos financieros (-)', field: 'financialExpenses', indent: true },

    { section: 'Resultado Financiero', isBold: true, bgClass: 'bg-blue-200', isCalculated: true },
    { section: 'Resultado antes de impuestos', isBold: true, bgClass: 'bg-amber-100', isCalculated: true },

    { label: 'Impuestos s/beneficios (-)', field: 'incomeTax', indent: true },

    { section: 'Resultado del Ejercicio', isBold: true, bgClass: 'bg-green-300', isCalculated: true },
  ];

  // Función auxiliar para calcular totales de P&G
  function calculateIncomeTotal(yearData: YearData, row: any): string {
    const income = yearData.income;

    // Resultado de explotación = Ingresos - Costes - Gastos
    if (row.section === 'Resultado de explotación') {
      const ingresos = Number(income.revenue || 0);
      const costes = Number(income.costOfSales || 0) + Number(income.staffCostsSales || 0);
      const gastos = Number(income.adminExpenses || 0) + Number(income.staffCostsAdmin || 0) + Number(income.depreciation || 0);
      return formatNumber(ingresos - costes - gastos);
    }

    // Resultado excepcional = Ingresos excepcionales - Gastos excepcionales
    if (row.section === 'Resultado excepcional') {
      return formatNumber(Number(income.exceptionalIncome || 0) - Number(income.exceptionalExpenses || 0));
    }

    // Resultado Financiero = Ingresos financieros - Gastos financieros
    if (row.section === 'Resultado Financiero') {
      return formatNumber(Number(income.financialIncome || 0) - Number(income.financialExpenses || 0));
    }

    // Resultado antes de impuestos = Resultado explotación + Resultado excepcional + Resultado financiero
    if (row.section === 'Resultado antes de impuestos') {
      const ingresos = Number(income.revenue || 0);
      const costes = Number(income.costOfSales || 0) + Number(income.staffCostsSales || 0);
      const gastos = Number(income.adminExpenses || 0) + Number(income.staffCostsAdmin || 0) + Number(income.depreciation || 0);
      const resultadoExplotacion = ingresos - costes - gastos;
      const resultadoExcepcional = Number(income.exceptionalIncome || 0) - Number(income.exceptionalExpenses || 0);
      const resultadoFinanciero = Number(income.financialIncome || 0) - Number(income.financialExpenses || 0);
      return formatNumber(resultadoExplotacion + resultadoExcepcional + resultadoFinanciero);
    }

    // Resultado del Ejercicio = Resultado antes de impuestos - Impuestos
    if (row.section === 'Resultado del Ejercicio') {
      const ingresos = Number(income.revenue || 0);
      const costes = Number(income.costOfSales || 0) + Number(income.staffCostsSales || 0);
      const gastos = Number(income.adminExpenses || 0) + Number(income.staffCostsAdmin || 0) + Number(income.depreciation || 0);
      const resultadoExplotacion = ingresos - costes - gastos;
      const resultadoExcepcional = Number(income.exceptionalIncome || 0) - Number(income.exceptionalExpenses || 0);
      const resultadoFinanciero = Number(income.financialIncome || 0) - Number(income.financialExpenses || 0);
      const resultadoAntesImpuestos = resultadoExplotacion + resultadoExcepcional + resultadoFinanciero;
      return formatNumber(resultadoAntesImpuestos - Number(income.incomeTax || 0));
    }

    return '';
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 min-w-[300px]">
            Pérdidas y Ganancias
          </th>
          {yearDataList.map((yearData) => (
            <th key={yearData.year} className="px-4 py-3 text-center min-w-[150px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase">{yearData.year}</span>
                {yearDataList.length > 1 && (
                  <button
                    onClick={() => onRemoveYear(yearData.year)}
                    className="text-red-500 hover:text-red-700"
                    title="Eliminar año"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {incomeFields.map((row, index) => {
          const indentClass = row.indent ? 'pl-8' : '';

          return (
            <tr key={index} className={row.bgClass || (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
              <td className={`px-4 py-2 text-sm sticky left-0 z-10 ${row.bgClass || (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')} ${row.isBold ? 'font-semibold' : ''} ${indentClass}`}>
                {row.section || row.subsection || row.label}
              </td>
              {row.section || row.subsection || row.isCalculated ? (
                yearDataList.map((yearData) => (
                  <td key={yearData.year} className="px-4 py-2 text-right font-semibold">
                    {row.isCalculated ? calculateIncomeTotal(yearData, row) : ''}
                  </td>
                ))
              ) : (
                yearDataList.map((yearData) => (
                  <td key={yearData.year} className="px-4 py-2">
                    <input
                      type="text"
                      value={formatNumber(yearData.income[row.field as keyof CreateIncomeStatementData])}
                      onChange={(e) => onUpdate(yearData.year, 'income', row.field!, e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </td>
                ))
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ==================== ADDITIONAL DATA TABLE ====================
const AdditionalDataTable: React.FC<TableProps> = ({ yearDataList, onUpdate, onRemoveYear }) => {
  const additionalFields = [
    { section: 'ACCIONES Y MERCADO', isBold: true, bgClass: 'bg-blue-100' },
    { label: 'Número de acciones/participaciones', field: 'sharesOutstanding', indent: true, isInteger: true },
    { label: 'Precio por acción (valor promedio del ejercicio)', field: 'sharePrice', indent: true },
    { label: 'Dividendos', field: 'dividendsPerShare', indent: true },

    { section: 'PERSONAL', isBold: true, bgClass: 'bg-green-100' },
    { label: 'Personal asalariado (cifra media del ejercicio)', field: 'averageEmployees', indent: true, isInteger: true },

    { section: 'INVENTARIO Y COMPRAS', isBold: true, bgClass: 'bg-orange-100' },
    { label: 'Existencias PROMEDIO del ejercicio', field: 'averageInventory', indent: true },
    { label: 'Consumo - coste del material vendido', field: 'materialCost', indent: true },
    { label: 'Compras', field: 'purchases', indent: true },

    { section: 'IMPUESTOS (IVA)', isBold: true, bgClass: 'bg-yellow-100' },
    { label: '% IVA promedio aplicado a las ventas', field: 'averageVatSales', indent: true },
    { label: '% IVA promedio aplicado a las compras', field: 'averageVatPurchases', indent: true },

    { section: 'FINANCIACIÓN', isBold: true, bgClass: 'bg-pink-100' },
    { label: 'Amortizaciones préstamos', field: 'loanAmortization', indent: true },
  ];

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 min-w-[300px]">
            Datos Adicionales
          </th>
          {yearDataList.map((yearData) => (
            <th key={yearData.year} className="px-4 py-3 text-center min-w-[150px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase">{yearData.year}</span>
                {yearDataList.length > 1 && (
                  <button
                    onClick={() => onRemoveYear(yearData.year)}
                    className="text-red-500 hover:text-red-700"
                    title="Eliminar año"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {additionalFields.map((row, index) => (
          <tr key={index} className={row.bgClass || (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
            <td className={`px-4 py-2 text-sm sticky left-0 z-10 ${row.bgClass || (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')} ${row.isBold ? 'font-semibold' : ''} ${row.indent ? 'pl-8' : ''}`}>
              {row.section || row.label}
            </td>
            {row.section ? (
              yearDataList.map((yearData) => (
                <td key={yearData.year} className="px-4 py-2"></td>
              ))
            ) : (
              yearDataList.map((yearData) => (
                <td key={yearData.year} className="px-4 py-2">
                  <input
                    type="text"
                    value={formatNumber(yearData.additional[row.field as keyof CreateAdditionalDataData])}
                    onChange={(e) => onUpdate(yearData.year, 'additional', row.field!, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="0"
                  />
                </td>
              ))
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
