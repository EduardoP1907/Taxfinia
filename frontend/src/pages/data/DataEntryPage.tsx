import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronRight, ChevronLeft, Check, Building2, FileText, BarChart3, PlusCircle } from 'lucide-react';
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
  { id: 1, name: 'Balance',    description: 'Activo y Pasivo',         icon: BarChart3 },
  { id: 2, name: 'P&G',        description: 'Ingresos y gastos',       icon: FileText  },
  { id: 3, name: 'Adicional',  description: 'Información complementaria', icon: PlusCircle },
];

export const DataEntryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate   = useNavigate();
  const companyId  = searchParams.get('companyId');
  const yearParam  = searchParams.get('year');

  const [currentStep, setCurrentStep]         = useState(1);
  const [company, setCompany]                 = useState<Company | null>(null);
  const [availableCompanies, setAvailable]    = useState<Company[]>([]);
  const [fiscalYear, setFiscalYear]           = useState<number>(new Date().getFullYear());
  const [fiscalYearId, setFiscalYearId]       = useState<string>('');
  const [loading, setLoading]                 = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [balanceData, setBalanceData]         = useState<CreateBalanceSheetData>({});
  const [incomeData, setIncomeData]           = useState<CreateIncomeStatementData>({});
  const [additionalData, setAdditionalData]   = useState<CreateAdditionalDataData>({});

  useEffect(() => { loadAvailableCompanies(); }, []);
  useEffect(() => {
    if (companyId) loadCompany();
    if (yearParam) setFiscalYear(parseInt(yearParam));
  }, [companyId, yearParam]);

  const loadAvailableCompanies = async () => {
    try {
      setAvailable(await companyService.getCompanies());
    } catch (e) { console.error(e); }
  };

  const loadCompany = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const data = await companyService.getCompany(companyId);
      setCompany(data);

      const fiscalYears = await financialService.getFiscalYears(companyId);
      let yearData = fiscalYears.find(fy => fy.year === fiscalYear);
      if (!yearData) yearData = await financialService.createFiscalYear(companyId, { year: fiscalYear });

      setFiscalYearId(yearData.id);

      const balance = await financialService.getBalanceSheet(yearData.id);
      if (balance) setBalanceData(balance);

      const income = await financialService.getIncomeStatement(yearData.id);
      if (income) setIncomeData(income);

      const additional = await financialService.getAdditionalData(yearData.id);
      if (additional) setAdditionalData(additional);
    } catch (e) {
      console.error(e);
      alert('Error al cargar la empresa');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentStep = async () => {
    if (!fiscalYearId) return;
    try {
      setSaving(true);
      if (currentStep === 1) await financialService.createOrUpdateBalanceSheet(fiscalYearId, balanceData);
      else if (currentStep === 2) await financialService.createOrUpdateIncomeStatement(fiscalYearId, incomeData);
      else if (currentStep === 3) await financialService.createOrUpdateAdditionalData(fiscalYearId, additionalData);
    } catch (e) {
      console.error(e);
      alert('Error al guardar los datos');
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleNext     = async () => { await saveCurrentStep(); if (currentStep < STEPS.length) setCurrentStep(s => s + 1); };
  const handlePrevious = () => { if (currentStep > 1) setCurrentStep(s => s - 1); };
  const handleFinish   = async () => { await saveCurrentStep(); alert('Datos guardados exitosamente'); navigate('/dashboard'); };

  const handleYearChange = (y: number) => {
    setSearchParams({ companyId: companyId!, year: y.toString() });
    setFiscalYear(y);
    setCurrentStep(1);
    loadCompany();
  };

  const updateBalanceField    = (f: keyof CreateBalanceSheetData,    v: string) => setBalanceData(p => ({ ...p, [f]: v === '' ? undefined : parseFloat(v) || 0 }));
  const updateIncomeField     = (f: keyof CreateIncomeStatementData, v: string) => setIncomeData(p => ({ ...p, [f]: v === '' ? undefined : parseFloat(v) || 0 }));
  const updateAdditionalField = (f: keyof CreateAdditionalDataData,  v: string) => setAdditionalData(p => ({ ...p, [f]: v === '' ? undefined : (f === 'averageEmployees' ? parseInt(v) || undefined : parseFloat(v) || undefined) }));

  // ── No company selected ───────────────────────────────────────────────────
  if (!companyId) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto mt-12">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Selecciona una empresa</h3>
            <p className="text-slate-500 text-sm mb-6">
              Elige la empresa para la cual deseas ingresar datos financieros
            </p>

            {availableCompanies.length > 0 ? (
              <div className="space-y-3">
                <select
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 text-slate-700"
                  onChange={(e) => {
                    const c = availableCompanies.find(c => c.id === e.target.value);
                    if (c) navigate(`/datos?companyId=${c.id}&year=${c.baseYear || new Date().getFullYear()}`);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Selecciona una empresa…</option>
                  {availableCompanies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.taxId ? ` — ${c.taxId}` : ''}</option>
                  ))}
                </select>
                <Button variant="outline" onClick={() => navigate('/empresas')} className="w-full">
                  Gestionar Empresas
                </Button>
              </div>
            ) : (
              <Button onClick={() => navigate('/empresas')} className="mx-auto">
                <Building2 className="w-4 h-4" />
                Crear Primera Empresa
              </Button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-data text-[10px] text-slate-400 tracking-[0.2em] uppercase">/ Ingresar Datos</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-slate-900 leading-tight">
              Datos Financieros
            </h1>
            <p className="text-slate-500 text-sm mt-1">{company?.name}</p>
          </div>
          <YearSelector companyId={companyId} currentYear={fiscalYear} onYearChange={handleYearChange} />
        </div>

        {/* ── Progress stepper ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center">
            {STEPS.map((step, i) => {
              const done   = step.id < currentStep;
              const active = step.id === currentStep;
              const Icon   = step.icon;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-3">
                    <div className={[
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
                      done   ? 'bg-slate-900 text-amber-400' :
                      active ? 'bg-amber-500 text-slate-900' :
                               'bg-slate-100 text-slate-400',
                    ].join(' ')}>
                      {done
                        ? <Check className="w-4 h-4" />
                        : <Icon className="w-4 h-4" />
                      }
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-xs font-semibold leading-tight ${active ? 'text-amber-600' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                        {step.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{step.description}</p>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-4 transition-colors duration-200 ${done ? 'bg-slate-300' : 'bg-slate-100'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Form content ─────────────────────────────────────────────────── */}
        <Card>
          <div className="min-h-[500px]">
            {currentStep === 1 && <BalanceSheetSection   data={balanceData}    onChange={updateBalanceField}    currency={company?.currency || 'EUR'} />}
            {currentStep === 2 && <IncomeStatementSection data={incomeData}    onChange={updateIncomeField}     currency={company?.currency || 'EUR'} />}
            {currentStep === 3 && <AdditionalDataSection  data={additionalData} onChange={updateAdditionalField} currency={company?.currency || 'EUR'} />}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
            <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1 || saving}>
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <span className="font-data text-xs text-slate-400 tracking-wide">
              {currentStep} / {STEPS.length}
            </span>

            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} disabled={saving} isLoading={saving}>
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={saving} isLoading={saving} variant="secondary">
                <Check className="w-4 h-4" />
                Finalizar
              </Button>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};
