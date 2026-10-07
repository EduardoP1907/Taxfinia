import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, RefreshCw, XCircle, CheckCircle2, Clock, FileText, Download, AlertTriangle, Star,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  comparisonReportService, type ComparisonReport, type ComparisonReportType,
} from '../../services/comparison-report.service';

const StatusBadge: React.FC<{ status: ComparisonReport['status'] }> = ({ status }) => {
  const config = {
    PENDING:    { icon: Clock,        label: 'Pendiente',  color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    GENERATING: { icon: RefreshCw,    label: 'Generando…', color: 'text-blue-600 bg-blue-50 border-blue-200 animate-pulse' },
    COMPLETED:  { icon: CheckCircle2, label: 'Completado', color: 'text-green-700 bg-green-50 border-green-200' },
    FAILED:     { icon: XCircle,      label: 'Error',      color: 'text-red-600 bg-red-50 border-red-200' },
  }[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

const POLL_INTERVAL_MS = 4000;

interface ComparisonAIReportPanelProps {
  companyId: string;
  companyName: string;
  type: ComparisonReportType;
  title: string;
  description: string;
}

export const ComparisonAIReportPanel: React.FC<ComparisonAIReportPanelProps> = ({
  companyId, companyName, type, title, description,
}) => {
  const [reports, setReports] = useState<ComparisonReport[]>([]);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [ineligibleReason, setIneligibleReason] = useState<string | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [starting, setStarting] = useState(false);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const all = await comparisonReportService.getCompanyReports(companyId);
      setReports(all.filter(r => r.type === type));
    } catch { /* silently fail */ }
  }, [companyId, type]);

  const loadEligibility = useCallback(async () => {
    setCheckingEligibility(true);
    try {
      const result = await comparisonReportService.getEligibility(companyId, type);
      setEligible(result.eligible);
      setIneligibleReason(result.eligible ? null : (result.reason || 'No es posible generar este informe.'));
    } catch {
      setEligible(false);
      setIneligibleReason('No se pudo verificar la disponibilidad de datos.');
    } finally {
      setCheckingEligibility(false);
    }
  }, [companyId, type]);

  useEffect(() => { loadReports(); loadEligibility(); }, [loadReports, loadEligibility]);

  // Generation runs in the background on the server (~1 min); while any report
  // is GENERATING, refresh the list until it turns COMPLETED or FAILED.
  const generating = starting || reports.some(r => r.status === 'GENERATING');
  useEffect(() => {
    if (!reports.some(r => r.status === 'GENERATING')) return;
    const timer = setInterval(loadReports, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reports, loadReports]);

  const handleGenerate = async () => {
    setStarting(true);
    setError(null);
    try {
      const { report } = await comparisonReportService.generateReport(companyId, type);
      setReports(prev => [report, ...prev.filter(r => r.id !== report.id)]);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al generar el informe comparativo.');
    } finally {
      setStarting(false);
    }
  };

  const handleDownloadClick = async (reportId: string, format: 'pdf' | 'docx', forecastYear: number) => {
    const key = `${reportId}-${format}`;
    setDownloading(prev => ({ ...prev, [key]: true }));
    try {
      await comparisonReportService.downloadReport(reportId, type, format, companyName, forecastYear);
    } catch {
      alert('Error al descargar el archivo');
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDownloadExecutive = async (report: ComparisonReport) => {
    const key = `${report.id}-executive`;
    setDownloading(prev => ({ ...prev, [key]: true }));
    try {
      const year = type === 'FORECAST_BUDGET_VS_ANNUAL' && report.budgetYear ? report.budgetYear : report.forecastYear;
      await comparisonReportService.downloadExecutiveSummary(report.id, type, companyName, year);
    } catch {
      alert('Error al generar el resumen ejecutivo');
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-amber-600">{description}</p>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || checkingEligibility || eligible === false}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm disabled:opacity-60"
          >
            {generating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Generando informe…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generar Informe</>
            )}
          </Button>
        </div>

        {!checkingEligibility && eligible === false && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700">{ineligibleReason}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {generating && (
          <div className="mb-4 flex justify-center py-4">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        )}

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
                <div key={report.id} className="bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          Forecast {report.forecastYear}{report.budgetYear ? ` · Budget ${report.budgetYear}` : ''}
                        </p>
                        <p className="text-xs text-gray-500">
                          {report.generatedAt
                            ? new Date(report.generatedAt).toLocaleString('es-ES')
                            : new Date(report.createdAt).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <StatusBadge status={report.status} />
                    </div>

                    {report.status === 'COMPLETED' && report.docxPath && (
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2 flex-wrap">
                        <button
                          onClick={() => handleDownloadClick(report.id, 'pdf', report.forecastYear)}
                          disabled={downloading[`${report.id}-pdf`]}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                          title="Descargar informe en PDF"
                        >
                          {downloading[`${report.id}-pdf`]
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <Download className="w-3 h-3" />}
                          Descargar (PDF)
                        </button>
                        <button
                          onClick={() => handleDownloadExecutive(report)}
                          disabled={downloading[`${report.id}-executive`]}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-50 transition-colors"
                          title="Descargar resumen ejecutivo para directorio (dashboard, semáforo, alertas y recomendaciones)"
                        >
                          {downloading[`${report.id}-executive`]
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <Star className="w-3 h-3" />}
                          Ejecutivo
                        </button>
                      </div>
                    )}

                    {report.status === 'FAILED' && (
                      <p className="text-xs text-red-500 max-w-[220px] truncate ml-2" title={report.errorMessage || ''}>
                        {report.errorMessage || 'Error desconocido'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reports.length === 0 && !generating && eligible !== false && (
          <p className="text-sm text-amber-500 text-center py-2">
            Aún no hay informes generados. Haz clic en "Generar Informe" para crear el primero.
          </p>
        )}
      </div>
    </>
  );
};
