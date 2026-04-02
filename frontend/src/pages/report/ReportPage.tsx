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
  Eye,
  Lock,
  KeyRound,
  ShieldCheck,
  X,
  Gift,
} from 'lucide-react';
import { companyService } from '../../services/company.service';
import { ratiosService, type CompanyAnalysis } from '../../services/ratios.service';
import { reportService, type Report } from '../../services/report.service';
import { useAuthStore } from '../../store/authStore';
import { YearSelector } from '../../components/data/YearSelector';
import { IncomeStatementSection } from '../../components/report/IncomeStatementSection';
import { BalanceSheetSection } from '../../components/report/BalanceSheetSection';
import { RatiosSection } from '../../components/report/RatiosSection';
import { generateFinancialReport } from '../../utils/pdfGenerator';
import { CompanyChat } from '../../components/report/CompanyChat';
import { ProtectedPdfViewer } from '../../components/report/ProtectedPdfViewer';
import { CompanySelector } from '../../components/companies/CompanySelector';

type TabType = 'resultados' | 'balance' | 'ratios';

// ─── Status Badge ─────────────────────────────────────────────────────────────
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

// ─── Preview Modal ─────────────────────────────────────────────────────────────
interface PreviewModalProps {
  previewUrl: string;
  companyName: string;
  year: number;
  expiresIn: number; // seconds
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ previewUrl, companyName, year, expiresIn, onClose }) => {
  const [secondsLeft, setSecondsLeft] = useState(expiresIn);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) { onClose(); return; }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, onClose]);

  // Block keyboard shortcuts (Ctrl+S, Ctrl+P, Ctrl+A, PrintScreen, Win+Shift+S)
  useEffect(() => {
    const blockShortcuts = (e: KeyboardEvent) => {
      // Block print, save, select all, and screenshot shortcuts
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', blockShortcuts, true);
    return () => document.removeEventListener('keydown', blockShortcuts, true);
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const pct = (secondsLeft / expiresIn) * 100;
  const timerColor = secondsLeft < 60 ? 'text-red-600' : secondsLeft < 180 ? 'text-orange-500' : 'text-emerald-600';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-white">Vista Previa Protegida</p>
            <p className="text-xs text-slate-400">{companyName} · Informe {year} · Solo visualización</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-sm font-mono font-bold ${timerColor}`}>{fmt(secondsLeft)}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Cerrar vista previa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF viewer area — canvas-based, no download button */}
      <div className="flex-1 relative overflow-hidden">
        <ProtectedPdfViewer
          pdfUrl={previewUrl}
        />
      </div>

      {/* Footer notice */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 border-t border-slate-700 flex-shrink-0">
        <Lock className="w-3.5 h-3.5 text-slate-500" />
        <p className="text-xs text-slate-400">
          Esta vista previa expira en <span className={`font-semibold ${timerColor}`}>{fmt(secondsLeft)}</span>.
          Para descargar el informe completo, solicita el código de descarga al administrador tras confirmar el pago.
        </p>
      </div>
    </div>
  );
};

// ─── Download Code Modal ───────────────────────────────────────────────────────
interface DownloadCodeModalProps {
  onConfirm: (code: string) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
}

const DownloadCodeModal: React.FC<DownloadCodeModalProps> = ({ onConfirm, onCancel, loading, error }) => {
  const [code, setCode] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <KeyRound className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Código de Descarga</h3>
            <p className="text-xs text-slate-500">Ingresa el código proporcionado por el administrador</p>
          </div>
        </div>

        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="PROMETHEIA-XXXX-XXXX"
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-center font-mono text-lg tracking-widest text-slate-900 mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && code.trim()) onConfirm(code.trim()); }}
        />

        {error && (
          <p className="text-sm text-red-600 mb-3 flex items-center gap-1">
            <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => code.trim() && onConfirm(code.trim())}
            disabled={!code.trim() || loading}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── AI Report Panel ──────────────────────────────────────────────────────────
interface AIReportPanelProps {
  companyId: string;
  companyName: string;
  selectedYear: number;
}

const AIReportPanel: React.FC<AIReportPanelProps> = ({ companyId, companyName, selectedYear }) => {
  const { user } = useAuthStore();
  const isTrial = user?.planType === 'TRIAL';
  const freeUsed = user?.freeReportsUsed ?? 0;
  const freeRemaining = Math.max(0, 2 - freeUsed);

  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [generatingCode, setGeneratingCode] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [previewState, setPreviewState] = useState<{
    url: string; expiresIn: number;
  } | null>(null);

  // Download code modal state
  const [codeModal, setCodeModal] = useState<{
    reportId: string; format: 'pdf' | 'docx';
  } | null>(null);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [codeLoading, setCodeLoading] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const data = await reportService.getCompanyReports(companyId);
      setReports(data);
    } catch { /* silently fail */ }
  }, [companyId]);

  useEffect(() => { loadReports(); }, [loadReports]);

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

  const handlePreview = async (reportId: string) => {
    try {
      const storageKey = `preview_token_${reportId}`;
      const stored = localStorage.getItem(storageKey);
      let token: string;
      let secondsLeft: number;

      if (stored) {
        const { t, expiresAt } = JSON.parse(stored) as { t: string; expiresAt: number };
        secondsLeft = Math.floor((expiresAt - Date.now()) / 1000);

        if (secondsLeft > 0) {
          // Reuse existing token — timer keeps counting from first open
          token = t;
        } else {
          // Expired — generate fresh token for a new session
          const res = await reportService.getPreviewToken(reportId);
          token = res.token;
          secondsLeft = res.expiresIn;
          localStorage.setItem(storageKey, JSON.stringify({ t: token, expiresAt: Date.now() + secondsLeft * 1000 }));
        }
      } else {
        // First time opening — generate and persist
        const res = await reportService.getPreviewToken(reportId);
        token = res.token;
        secondsLeft = res.expiresIn;
        localStorage.setItem(storageKey, JSON.stringify({ t: token, expiresAt: Date.now() + secondsLeft * 1000 }));
      }

      setPreviewState({ url: reportService.getPreviewUrl(token), expiresIn: secondsLeft });
    } catch {
      alert('Error al generar la vista previa. Inténtalo de nuevo.');
    }
  };

  const handleDownloadClick = (reportId: string, format: 'pdf' | 'docx') => {
    const report = reports.find(r => r.id === reportId);
    // Both formats require code if one has been set
    if (report?.hasDownloadCode) {
      setCodeError(undefined);
      setCodeModal({ reportId, format });
    } else {
      doDownload(reportId, format);
    }
  };

  const doDownload = async (reportId: string, format: 'pdf' | 'docx', code?: string) => {
    const key = `${reportId}-${format}`;
    setDownloading(prev => ({ ...prev, [key]: true }));
    try {
      await reportService.downloadReport(reportId, format, companyName, selectedYear, code);
      setCodeModal(null);
    } catch (err: any) {
      if (err?.response?.data?.requiresCode) {
        setCodeModal({ reportId, format });
        setCodeError('Código incorrecto. Inténtalo de nuevo.');
      } else {
        alert('Error al descargar el archivo');
      }
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleCodeConfirm = async (code: string) => {
    if (!codeModal) return;
    setCodeLoading(true);
    setCodeError(undefined);
    try {
      await reportService.downloadReport(codeModal.reportId, codeModal.format, companyName, selectedYear, code);
      setCodeModal(null);
    } catch (err: any) {
      if (err?.response?.data?.requiresCode || err?.response?.status === 403) {
        setCodeError('Código incorrecto. Verifica e inténtalo de nuevo.');
      } else {
        setCodeError('Error al descargar. Inténtalo de nuevo.');
      }
    } finally {
      setCodeLoading(false);
    }
  };

  const handleGenerateCode = async (reportId: string) => {
    setGeneratingCode(prev => ({ ...prev, [reportId]: true }));
    try {
      await reportService.generateDownloadCode(reportId);
      await loadReports(); // refresh to show hasDownloadCode = true
      alert('Código generado. El administrador recibirá un correo con el código de descarga.');
    } catch {
      alert('Error al generar el código. Inténtalo de nuevo.');
    } finally {
      setGeneratingCode(prev => ({ ...prev, [reportId]: false }));
    }
  };

  return (
    <>
      {/* Preview modal */}
      {previewState && (
        <PreviewModal
          previewUrl={previewState.url}
          companyName={companyName}
          year={selectedYear}
          expiresIn={previewState.expiresIn}
          onClose={() => setPreviewState(null)}
        />
      )}

      {/* Download code modal */}
      {codeModal && (
        <DownloadCodeModal
          onConfirm={handleCodeConfirm}
          onCancel={() => setCodeModal(null)}
          loading={codeLoading}
          error={codeError}
        />
      )}

      <div className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200 rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Informe Profesional con IA</h3>
              <p className="text-xs text-amber-600">Reporte PDF con tablas + Análisis redactado por IA</p>
            </div>
            {isTrial && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                freeRemaining > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <Gift className="w-3 h-3" />
                {freeRemaining > 0
                  ? `${freeRemaining} informe${freeRemaining > 1 ? 's' : ''} gratuito${freeRemaining > 1 ? 's' : ''}`
                  : 'Sin informes gratuitos'}
              </span>
            )}
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
              <p className="text-xs text-gray-500">Tablas de ratios, balance y resultados para {selectedYear}.</p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-amber-100 flex items-start gap-2">
            <Eye className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Análisis Narrativo (Vista previa 5 min)</p>
              <p className="text-xs text-gray-500">Análisis IA con interpretaciones financieras y valoración DCF. Descarga protegida con código.</p>
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

        {/* Generating state */}
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
                <div key={report.id} className="bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">Informe {report.year}</p>
                        <p className="text-xs text-gray-500">
                          {report.generatedAt
                            ? new Date(report.generatedAt).toLocaleString('es-CL')
                            : new Date(report.createdAt).toLocaleString('es-CL')}
                        </p>
                      </div>
                      <StatusBadge status={report.status} />
                    </div>

                    {report.status === 'COMPLETED' && (
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {/* Tables PDF — always free */}
                        <button
                          onClick={() => handleDownloadClick(report.id, 'pdf')}
                          disabled={downloading[`${report.id}-pdf`]}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                          title="Descargar PDF con tablas"
                        >
                          {downloading[`${report.id}-pdf`]
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <FileDown className="w-3 h-3" />}
                          PDF
                        </button>

                        {/* Analysis PDF — preview button */}
                        {report.docxPath && (
                          <button
                            onClick={() => handlePreview(report.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Vista previa del análisis (15 min)"
                          >
                            <Eye className="w-3 h-3" />
                            Vista Previa
                          </button>
                        )}

                        {/* Analysis PDF download — requires code if set */}
                        {report.docxPath && (
                          report.hasDownloadCode ? (
                            <button
                              onClick={() => handleDownloadClick(report.id, 'docx')}
                              disabled={downloading[`${report.id}-docx`]}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                              title="Descargar análisis (requiere código)"
                            >
                              {downloading[`${report.id}-docx`]
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <Lock className="w-3 h-3" />}
                              Descargar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGenerateCode(report.id)}
                              disabled={generatingCode[report.id]}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
                              title="Generar código de descarga y notificar al administrador"
                            >
                              {generatingCode[report.id]
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <KeyRound className="w-3 h-3" />}
                              Solicitar
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {report.status === 'FAILED' && (
                      <p className="text-xs text-red-500 max-w-[200px] truncate ml-2" title={report.errorMessage || ''}>
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
            Aún no hay informes generados para esta empresa. Haz clic en "Generar Informe IA" para crear el primero.
          </p>
        )}
      </div>
    </>
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
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(parseInt(yearParam || '') || new Date().getFullYear());
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'resultados');

  // Chat lock state — persisted per company in localStorage
  const chatStorageKey = companyId ? `chat_unlocked_${companyId}` : null;
  const [chatUnlocked, setChatUnlocked] = useState(() => {
    if (!companyId) return true;
    return localStorage.getItem(`chat_unlocked_${companyId}`) === 'true';
  });

  // Chat unlock modal state (reuses DownloadCodeModal)
  const [chatCodeModal, setChatCodeModal] = useState(false);
  const [chatCodeError, setChatCodeError] = useState<string | undefined>();
  const [chatCodeLoading, setChatCodeLoading] = useState(false);

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
      setAvailableCompanies(companies);
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

  const handleChatUnlock = async (code: string) => {
    if (!companyId) return;
    setChatCodeLoading(true);
    setChatCodeError(undefined);
    try {
      // Find any report with a download code to validate against
      const reports = await reportService.getCompanyReports(companyId);
      const reportWithCode = reports.find(r => r.hasDownloadCode);
      if (!reportWithCode) {
        // No code set — unlock freely
        setChatUnlocked(true);
        if (chatStorageKey) localStorage.setItem(chatStorageKey, 'true');
        setChatCodeModal(false);
        return;
      }
      const valid = await reportService.validateCode(reportWithCode.id, code);
      if (valid) {
        setChatUnlocked(true);
        if (chatStorageKey) localStorage.setItem(chatStorageKey, 'true');
        setChatCodeModal(false);
      } else {
        setChatCodeError('Código incorrecto. Verifica e inténtalo de nuevo.');
      }
    } catch {
      setChatCodeError('Error al validar el código. Inténtalo de nuevo.');
    } finally {
      setChatCodeLoading(false);
    }
  };

  // Determine if chat should be locked: locked only if any report has a download code
  // and the user hasn't unlocked yet
  const [chatShouldLock, setChatShouldLock] = useState(false);
  useEffect(() => {
    if (!companyId || chatUnlocked) return;
    reportService.getCompanyReports(companyId).then(reports => {
      setChatShouldLock(reports.some(r => r.hasDownloadCode));
    }).catch(() => {});
  }, [companyId, chatUnlocked]);

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

  if (!companyId) {
    return (
      <CompanySelector
        companies={availableCompanies}
        title="Informe Económico-Financiero"
        description="Selecciona la empresa para ver su informe"
        icon={<FileText className="w-7 h-7 text-slate-900" />}
        onSelect={(c) => navigate(`/informe?companyId=${c.id}&year=${c.baseYear || new Date().getFullYear()}`)}
      />
    );
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Empresa no encontrada</h3>
              <p className="text-gray-600 mb-6">No se pudo cargar la empresa seleccionada</p>
              <Button onClick={() => navigate('/informe')}>Volver al selector</Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

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

        {/* AI Report Panel */}
        <AIReportPanel
          companyId={companyId}
          companyName={company.name}
          selectedYear={selectedYear}
        />

        {/* Chat unlock modal */}
        {chatCodeModal && (
          <DownloadCodeModal
            onConfirm={handleChatUnlock}
            onCancel={() => { setChatCodeModal(false); setChatCodeError(undefined); }}
            loading={chatCodeLoading}
            error={chatCodeError}
          />
        )}

        {/* Company Chat */}
        <CompanyChat
          companyId={companyId}
          companyName={company.name}
          isLocked={!chatUnlocked && chatShouldLock}
          onUnlock={() => { setChatCodeError(undefined); setChatCodeModal(true); }}
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
                El informe generado con IA incluye un <strong>Análisis Redactado</strong> (interpretaciones narrativas y valoración DCF)
                disponible en vista previa de 15 minutos, y un <strong>Reporte PDF con Tablas</strong> descargable.
                La descarga del análisis completo requiere un <strong>código de acceso</strong> obtenido tras confirmar el pago con el administrador.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
