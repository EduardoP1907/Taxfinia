import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, RefreshCw, XCircle, CheckCircle2, Clock, FileText,
  Lock, KeyRound, Crown, Star,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { monthlyReportService, type MonthlyReport } from '../../services/monthly-report.service';
import { DownloadCodeModal } from './DownloadCodeModal';

const StatusBadge: React.FC<{ status: MonthlyReport['status'] }> = ({ status }) => {
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

interface MonthlyAIReportPanelProps {
  companyId: string;
  companyName: string;
  year: number;
}

export const MonthlyAIReportPanel: React.FC<MonthlyAIReportPanelProps> = ({ companyId, companyName, year }) => {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [generatingCode, setGeneratingCode] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const [codeModal, setCodeModal] = useState<{
    reportId: string; variant: 'prometheia' | 'ejecutivo'; format: 'pdf' | 'docx';
  } | null>(null);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [codeLoading, setCodeLoading] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const data = await monthlyReportService.getCompanyReports(companyId);
      setReports(data);
    } catch { /* silently fail */ }
  }, [companyId]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { report } = await monthlyReportService.generateReport(companyId, year);
      setReports(prev => [report, ...prev.filter(r => r.id !== report.id)]);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al generar el informe mensual. Verifica que el Forecast Mensual tenga datos guardados.');
    } finally {
      setGenerating(false);
    }
  };

  const reportCodeKey = (reportId: string) => `monthly_report_code_${reportId}`;

  const doDownload = async (
    reportId: string, variant: 'prometheia' | 'ejecutivo', format: 'pdf' | 'docx', code?: string,
  ) => {
    const key = `${reportId}-${variant}-${format}`;
    setDownloading(prev => ({ ...prev, [key]: true }));
    try {
      await monthlyReportService.downloadReport(reportId, variant, format, companyName, year, code);
      if (code) localStorage.setItem(reportCodeKey(reportId), code);
      setCodeModal(null);
    } catch (err: any) {
      let requiresCode = false;
      if (err?.response?.data instanceof Blob) {
        try { const json = JSON.parse(await err.response.data.text()); requiresCode = !!json.requiresCode; } catch {}
      } else {
        requiresCode = !!err?.response?.data?.requiresCode;
      }
      if (requiresCode) {
        localStorage.removeItem(reportCodeKey(reportId));
        setCodeError(undefined);
        setCodeModal({ reportId, variant, format });
      } else {
        alert('Error al descargar el archivo');
      }
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDownloadClick = (reportId: string, variant: 'prometheia' | 'ejecutivo', format: 'pdf' | 'docx') => {
    const stored = localStorage.getItem(reportCodeKey(reportId));
    doDownload(reportId, variant, format, stored || undefined);
  };

  const handleCodeConfirm = async (code: string) => {
    if (!codeModal) return;
    setCodeLoading(true);
    setCodeError(undefined);
    try {
      await doDownload(codeModal.reportId, codeModal.variant, codeModal.format, code);
    } catch {
      setCodeError('Código incorrecto');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleGenerateCode = async (reportId: string) => {
    setGeneratingCode(prev => ({ ...prev, [reportId]: true }));
    try {
      await monthlyReportService.generateDownloadCode(reportId);
      localStorage.removeItem(reportCodeKey(reportId));
      await loadReports(); // refresh to reflect the new downloadCode from the server
      alert('Código solicitado. El administrador recibirá un correo con el código de descarga.');
    } catch {
      alert('Error al solicitar el código');
    } finally {
      setGeneratingCode(prev => ({ ...prev, [reportId]: false }));
    }
  };

  return (
    <>
      {codeModal && (
        <DownloadCodeModal
          onConfirm={handleCodeConfirm}
          onCancel={() => setCodeModal(null)}
          loading={codeLoading}
          error={codeError}
        />
      )}

      <div className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Informe Mensual con IA</h3>
              <p className="text-xs text-amber-600">Prometheia (completo) y Ejecutivo (conciso) — basados en el Forecast {year}</p>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm disabled:opacity-60"
          >
            {generating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Generando informe…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generar Informe IA Mensual</>
            )}
          </Button>
        </div>

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
                        <p className="text-sm font-medium text-gray-800">Forecast {report.year}</p>
                        <p className="text-xs text-gray-500">
                          {report.generatedAt
                            ? new Date(report.generatedAt).toLocaleString('es-ES')
                            : new Date(report.createdAt).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <StatusBadge status={report.status} />
                    </div>

                    {report.status === 'COMPLETED' && (
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2 flex-wrap">
                        {report.docxPathPrometheia && (
                          report.hasDownloadCode ? (
                            <button
                              onClick={() => handleDownloadClick(report.id, 'prometheia', 'docx')}
                              disabled={downloading[`${report.id}-prometheia-docx`]}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                              title="Descargar informe Prometheia (requiere código)"
                            >
                              {downloading[`${report.id}-prometheia-docx`]
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <Lock className="w-3 h-3" />}
                              Prometheia
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGenerateCode(report.id)}
                              disabled={generatingCode[report.id]}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
                              title="Solicitar código al administrador — desbloquea ambos informes"
                            >
                              {generatingCode[report.id]
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <KeyRound className="w-3 h-3" />}
                              Solicitar código
                            </button>
                          )
                        )}

                        {report.docxPathEjecutivo && report.hasDownloadCode && (
                          <button
                            onClick={() => handleDownloadClick(report.id, 'ejecutivo', 'docx')}
                            disabled={downloading[`${report.id}-ejecutivo-docx`]}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-50 transition-colors"
                            title="Descargar informe Ejecutivo"
                          >
                            {downloading[`${report.id}-ejecutivo-docx`]
                              ? <RefreshCw className="w-3 h-3 animate-spin" />
                              : <Star className="w-3 h-3" />}
                            Ejecutivo
                          </button>
                        )}

                        {!report.docxPathPrometheia && !report.docxPathEjecutivo && (
                          <Crown className="w-3.5 h-3.5 text-slate-300" />
                        )}
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

        {reports.length === 0 && !generating && (
          <p className="text-sm text-amber-500 text-center py-2">
            Aún no hay informes mensuales generados. Haz clic en "Generar Informe IA Mensual" para crear el primero.
          </p>
        )}
      </div>
    </>
  );
};
