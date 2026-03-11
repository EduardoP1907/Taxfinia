import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Download,
  AlertCircle,
  Building2,
  FileText,
  BarChart3,
  TrendingUp,
  Sparkles,
  FileDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import { companyService } from '../../services/company.service';
import { ratiosService, type CompanyAnalysis } from '../../services/ratios.service';
import { reportService, type Report } from '../../services/report.service';
import { YearSelector } from '../../components/data/YearSelector';
import { IncomeStatementSection } from '../../components/report/IncomeStatementSection';
import { BalanceSheetSection } from '../../components/report/BalanceSheetSection';
import { RatiosSection } from '../../components/report/RatiosSection';
import { generateFinancialReport } from '../../utils/pdfGenerator';

type TabType = 'resultados' | 'balance' | 'ratios';

// ─── Report Status Badge ──────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: Report['status'] }> = ({ status }) => {
  const config = {
    PENDING:    { icon: Clock,         label: 'Pendiente',  color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    GENERATING: { icon: RefreshCw,     label: 'Generando…', color: 'text-blue-600 bg-blue-50 border-blue-200 animate-pulse' },
    COMPLETED:  { icon: CheckCircle2,  label: 'Completado', color: 'text-green-700 bg-green-50 border-green-200' },
    FAILED:     { icon: XCircle,       label: 'Error',      color: 'text-red-600 bg-red-50 border-red-200' },
  }[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// ─── AI Report Panel ──────────────────────────────────────────────────────────
interface AIReportPanelProps {
  companyId: string;
  companyName: string;
  selectedYear: number;
}

const AIReportPanel: React.FC<AIReportPanelProps> = ({ companyId, companyName, selectedYear }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const data = await reportService.getCompanyReports(companyId);
      setReports(data);
    } catch {
      // silently fail
    }
  }, [companyId]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { report } = await reportService.generateReport(companyId, selectedYear);
      setReports(prev => [report, ...prev.filter(r => r.id !== report.id)]);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al generar el informe. Verifica que haya datos financieros completos.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId: string, format: 'pdf' | 'docx') => {
    const key = `${reportId}-${format}`;
    setDownloading(prev => ({ ...prev, [key]: true }));
    try {
      await reportService.downloadReport(reportId, format, companyName, selectedYear);
    } catch {
      alert('Error al descargar el archivo');
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Informe Profesional con IA</h3>
            <p className="text-xs text-amber-600">Reporte PDF con tablas + Análisis Word redactado por IA</p>
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm disabled:opacity-60"
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generando informe…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generar Informe IA
            </>
          )}
        </Button>
      </div>

      {/* What you get */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-lg p-3 border border-amber-100 flex items-start gap-2">
          <FileDown className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Reporte PDF con Tablas</p>
            <p className="text-xs text-gray-500">Tablas de ratios, balance y resultados para {selectedYear}. Descarga en formato PDF.</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-amber-100 flex items-start gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Análisis Redactado en Word</p>
            <p className="text-xs text-gray-500">Análisis profesional redactado por IA con interpretaciones financieras y valoración DCF. Descarga en formato Word.</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {generating && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
            <p className="text-sm font-semibold text-blue-800">Claude AI está analizando la empresa…</p>
          </div>
          <div className="space-y-1 pl-7">
            <p className="text-xs text-blue-600">✓ Calculando ratios financieros</p>
            <p className="text-xs text-blue-600 animate-pulse">⟳ Generando análisis narrativo con IA</p>
            <p className="text-xs text-blue-400">○ Creando PDF analítico y Word profesional</p>
          </div>
        </div>
      )}

      {/* Generated reports list */}
      {reports.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Informes Generados</p>
            <button onClick={loadReports} className="text-xs text-amber-500 hover:text-amber-700 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Actualizar
            </button>
          </div>
          <div className="space-y-2">
            {reports.map(report => (
              <div key={report.id} className="bg-white rounded-lg p-3 border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Informe {report.year}
                    </p>
                    <p className="text-xs text-gray-500">
                      {report.generatedAt
                        ? new Date(report.generatedAt).toLocaleString('es-CL')
                        : new Date(report.createdAt).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <StatusBadge status={report.status} />
                </div>

                {report.status === 'COMPLETED' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(report.id, 'pdf')}
                      disabled={downloading[`${report.id}-pdf`]}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                      title="Descargar Reporte PDF con Tablas"
                    >
                      {downloading[`${report.id}-pdf`]
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <FileDown className="w-3 h-3" />}
                      PDF
                    </button>
                    <button
                      onClick={() => handleDownload(report.id, 'docx')}
                      disabled={downloading[`${report.id}-docx`]}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                      title="Descargar Análisis Redactado en Word"
                    >
                      {downloading[`${report.id}-docx`]
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <FileSpreadsheet className="w-3 h-3" />}
                      Word
                    </button>
                  </div>
                )}

                {report.status === 'FAILED' && (
                  <p className="text-xs text-red-500 max-w-[200px] truncate" title={report.errorMessage || ''}>
                    {report.errorMessage || 'Error desconocido'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {reports.length === 0 && !generating && (
        <p className="text-sm text-amber-500 text-center py-2">
          Aún no hay informes generados para esta empresa. Haz clic en "Generar Informe IA" para crear el primero.
        </p>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const ReportPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyId = searchParams.get('companyId');
  const yearParam = searchParams.get('year');
  const tabParam = searchParams.get('tab') as TabType;

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(parseInt(yearParam || '') || new Date().getFullYear());
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'resultados');

  useEffect(() => {
    if (companyId) {
      loadCompanyAnalysis();
    } else {
      loadAvailableCompanies();
    }
  }, [companyId]);

  useEffect(() => {
    if (tabParam && ['resultados', 'balance', 'ratios'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const loadAvailableCompanies = async () => {
    try {
      const companies = await companyService.getCompanies();
      if (companies.length > 0 && !companyId) {
        navigate(`/informe?companyId=${companies[0].id}&year=${companies[0].baseYear || new Date().getFullYear()}`);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyAnalysis = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const data = await ratiosService.getCompanyAnalysis(companyId);
      const hasRatios = data.analysis.some(year => year.ratios !== null);
      if (!hasRatios && data.analysis.length > 0) {
        await ratiosService.calculateCompanyRatios(companyId);
        const updatedData = await ratiosService.getCompanyAnalysis(companyId);
        setAnalysis(updatedData);
        setCompany(updatedData.company);
      } else {
        setAnalysis(data);
        setCompany(data.company);
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (newYear: number) => {
    setSearchParams({
      companyId: companyId!,
      year: newYear.toString(),
      ...(activeTab !== 'resultados' && { tab: activeTab }),
    });
    setSelectedYear(newYear);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({
      companyId: companyId!,
      year: selectedYear.toString(),
      ...(tab !== 'resultados' && { tab }),
    });
  };

  const handleDownloadPDF = () => {
    if (!analysis) return;
    try {
      const pdfData = {
        company: { name: company.name, taxId: company.taxId },
        years: analysis.analysis.map(yearData => ({
          year: yearData.year,
          incomeStatement: yearData.incomeStatement,
          balanceSheet: yearData.balanceSheet,
          cashFlow: yearData.cashFlow,
          additionalData: yearData.additionalData,
        })),
        ratios: analysis.analysis.map(yearData => yearData.ratios),
      };
      generateFinancialReport(pdfData);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando informe...</p>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ── No company selected ──
  if (!companyId || !company) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecciona una empresa</h3>
              <p className="text-gray-600 mb-6">Elige la empresa para ver su informe económico-financiero</p>
              <Button onClick={() => navigate('/empresas')}>Ver Empresas</Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ── No data ──
  if (!analysis || analysis.analysis.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Informe Económico-Financiero</h1>
              <p className="text-gray-600">{company.name}</p>
            </div>
          </div>
          <Card>
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay datos disponibles</h3>
              <p className="text-gray-600 mb-6">Primero debes ingresar los datos financieros de la empresa</p>
              <Button onClick={() => navigate(`/datos?companyId=${companyId}&year=${new Date().getFullYear()}`)}>
                Ingresar Datos
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { id: 'resultados' as TabType, label: 'Pérdidas y Ganancias', icon: FileText },
    { id: 'balance' as TabType, label: 'Balance de Situación', icon: BarChart3 },
    { id: 'ratios' as TabType, label: 'Ratios Financieros', icon: TrendingUp },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Informe Económico-Financiero</h1>
              <p className="text-gray-600">{company.name} {company.taxId && `• ${company.taxId}`}</p>
            </div>
            <div className="flex items-center gap-3">
              <YearSelector companyId={companyId} currentYear={selectedYear} onYearChange={handleYearChange} />
              <Button className="flex items-center gap-2" variant="outline" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4" />
                Exportar PDF básico
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sector</p>
              <p className="text-sm font-medium text-gray-900">{company.industry || 'No especificado'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">País</p>
              <p className="text-sm font-medium text-gray-900">{company.country || 'ES'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Moneda</p>
              <p className="text-sm font-medium text-gray-900">{company.currency || 'EUR'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ejercicios Disponibles</p>
              <p className="text-sm font-medium text-gray-900">{analysis.analysis.length} años</p>
            </div>
          </div>
        </div>

        {/* ── AI Report Panel ── */}
        <AIReportPanel
          companyId={companyId}
          companyName={company.name}
          selectedYear={selectedYear}
        />

        {/* Financial Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                      ${isActive
                        ? 'border-amber-600 text-amber-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="p-6">
            {activeTab === 'resultados' && (
              <IncomeStatementSection years={analysis.analysis} currency={company.currency} />
            )}
            {activeTab === 'balance' && (
              <BalanceSheetSection years={analysis.analysis} currency={company.currency} />
            )}
            {activeTab === 'ratios' && (
              <RatiosSection years={analysis.analysis} />
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Nota Importante</h4>
              <p className="text-sm text-slate-800">
                El informe generado con IA incluye un <strong>Análisis Redactado en Word</strong> (interpretaciones narrativas y valoración DCF) y un <strong>Reporte PDF con Tablas</strong> (ratios, balance y resultados en formato estructurado).
                Los análisis son generados por Claude AI de Anthropic basándose en los datos financieros ingresados.
                Los resultados deben ser interpretados por profesionales cualificados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
