import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronRight, ChevronLeft, Check, Building2 } from 'lucide-react';
import { companyService } from '../../services/company.service';
import { financialService } from '../../services/financial.service';
import { BalanceSheetSection } from '../../components/data/BalanceSheetSection';
import { IncomeStatementSection } from '../../components/data/IncomeStatementSection';
import { AdditionalDataSection } from '../../components/data/AdditionalDataSection';
import { YearSelector } from '../../components/data/YearSelector';
import type { Company } from '../../types/company';
import type {
  CreateBalanceSheetData,
  CreateIncomeStatementData,
  CreateAdditionalDataData,
} from '../../types/financial';

const STEPS = [
  { id: 1, name: 'Balance de Situación', description: 'Activo y Pasivo' },
  { id: 2, name: 'Cuenta de Pérdidas y Ganancias', description: 'Ingresos y gastos' },
  { id: 3, name: 'Datos Adicionales', description: 'Información complementaria' },
];

export const DataEntryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyId = searchParams.get('companyId');
  const fiscalYearParam = searchParams.get('year');

  const [currentStep, setCurrentStep] = useState(1);
  const [company, setCompany] = useState<Company | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear());
  const [fiscalYearId, setFiscalYearId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados del formulario
  const [balanceData, setBalanceData] = useState<CreateBalanceSheetData>({});
  const [incomeData, setIncomeData] = useState<CreateIncomeStatementData>({});
  const [additionalData, setAdditionalData] = useState<CreateAdditionalDataData>({});

  useEffect(() => {
    loadAvailableCompanies();
  }, []);

  useEffect(() => {
    if (companyId) {
      loadCompany();
    }
    if (fiscalYearParam) {
      setFiscalYear(parseInt(fiscalYearParam));
    }
  }, [companyId, fiscalYearParam]);

  const loadAvailableCompanies = async () => {
    try {
      const companies = await companyService.getCompanies();
      setAvailableCompanies(companies);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadCompany = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const data = await companyService.getCompany(companyId);
      setCompany(data);

      // Crear o obtener año fiscal
      const fiscalYears = await financialService.getFiscalYears(companyId);
      let yearData = fiscalYears.find(fy => fy.year === fiscalYear);

      if (!yearData) {
        yearData = await financialService.createFiscalYear(companyId, {
          year: fiscalYear,
        });
      }

      setFiscalYearId(yearData.id);

      // Cargar datos existentes si los hay
      const balance = await financialService.getBalanceSheet(yearData.id);
      if (balance) {
        setBalanceData(balance);
      }

      const income = await financialService.getIncomeStatement(yearData.id);
      if (income) {
        setIncomeData(income);
      }

      const additional = await financialService.getAdditionalData(yearData.id);
      if (additional) {
        setAdditionalData(additional);
      }
    } catch (error) {
      console.error('Error loading company:', error);
      alert('Error al cargar la empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    // Guardar el paso actual antes de avanzar
    await saveCurrentStep();

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveCurrentStep = async () => {
    if (!fiscalYearId) return;

    try {
      setSaving(true);

      if (currentStep === 1) {
        await financialService.createOrUpdateBalanceSheet(fiscalYearId, balanceData);
      } else if (currentStep === 2) {
        await financialService.createOrUpdateIncomeStatement(fiscalYearId, incomeData);
      } else if (currentStep === 3) {
        await financialService.createOrUpdateAdditionalData(fiscalYearId, additionalData);
      }
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Error al guardar los datos');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    await saveCurrentStep();
    alert('Datos guardados exitosamente');
    navigate('/dashboard');
  };

  const updateBalanceField = (field: keyof CreateBalanceSheetData, value: string) => {
    setBalanceData(prev => ({
      ...prev,
      [field]: value === '' ? undefined : parseFloat(value) || 0,
    }));
  };

  const updateIncomeField = (field: keyof CreateIncomeStatementData, value: string) => {
    setIncomeData(prev => ({
      ...prev,
      [field]: value === '' ? undefined : parseFloat(value) || 0,
    }));
  };

  const updateAdditionalField = (field: keyof CreateAdditionalDataData, value: string) => {
    setAdditionalData(prev => ({
      ...prev,
      [field]: value === '' ? undefined : (field === 'averageEmployees' ? parseInt(value) || undefined : parseFloat(value) || undefined),
    }));
  };

  if (!companyId) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Selecciona una empresa
              </h3>
              <p className="text-gray-600 mb-6">
                Elige la empresa para la cual deseas ingresar datos financieros
              </p>

              {availableCompanies.length > 0 ? (
                <div className="max-w-md mx-auto">
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-4"
                    onChange={(e) => {
                      const selectedCompany = availableCompanies.find(c => c.id === e.target.value);
                      if (selectedCompany) {
                        navigate(`/datos?companyId=${selectedCompany.id}&year=${selectedCompany.baseYear || new Date().getFullYear()}`);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Selecciona una empresa...</option>
                    {availableCompanies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name} {company.taxId ? `- ${company.taxId}` : ''}
                      </option>
                    ))}
                  </select>
                  <Button onClick={() => navigate('/empresas')} variant="outline">
                    Gestionar Empresas
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">
                    No tienes empresas creadas aún
                  </p>
                  <Button onClick={() => navigate('/empresas')}>
                    Crear Primera Empresa
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando datos...</p>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleYearChange = (newYear: number) => {
    setSearchParams({ companyId: companyId!, year: newYear.toString() });
    setFiscalYear(newYear);
    // Reset current step and reload data
    setCurrentStep(1);
    loadCompany();
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Ingresar Datos Financieros
            </h1>
            <p className="text-gray-600">
              {company?.name}
            </p>
          </div>
          <YearSelector
            companyId={companyId}
            currentYear={fiscalYear}
            onYearChange={handleYearChange}
          />
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step.id < currentStep
                        ? 'bg-green-500 text-white'
                        : step.id === currentStep
                        ? 'bg-amber-500 text-slate-900 font-semibold'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${
                      step.id === currentStep ? 'text-amber-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </div>
                    <div className="text-xs text-gray-400">{step.description}</div>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 ${
                    step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Card>
          <div className="min-h-[500px]">
            {currentStep === 1 && <BalanceSheetSection data={balanceData} onChange={updateBalanceField} currency={company?.currency || 'EUR'} />}
            {currentStep === 2 && <IncomeStatementSection data={incomeData} onChange={updateIncomeField} currency={company?.currency || 'EUR'} />}
            {currentStep === 3 && <AdditionalDataSection data={additionalData} onChange={updateAdditionalField} currency={company?.currency || 'EUR'} />}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || saving}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>

            <div className="text-sm text-gray-500">
              Paso {currentStep} de {STEPS.length}
            </div>

            {currentStep < STEPS.length ? (
              <Button
                onClick={handleNext}
                disabled={saving}
                loading={saving}
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={saving}
                loading={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Finalizar
              </Button>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};
