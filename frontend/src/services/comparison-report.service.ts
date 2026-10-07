import api from './api';

export type ComparisonReportType = 'FORECAST_VS_ANNUAL' | 'FORECAST_BUDGET_VS_ANNUAL';

export interface ComparisonReport {
  id: string;
  type: ComparisonReportType;
  forecastYear: number;
  budgetYear: number | null;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  generatedAt: string | null;
  docxPath: string | null;
  hasDownloadCode: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export interface ComparisonEligibility {
  eligible: boolean;
  reason?: string;
  annualYears: number[];
  forecastYear: number;
  budgetYear?: number;
}

export const comparisonReportService = {
  async getEligibility(companyId: string, type: ComparisonReportType): Promise<ComparisonEligibility> {
    const response = await api.get(`/comparison-reports/${companyId}/eligibility`, { params: { type } });
    return response.data;
  },

  // Starts generation in the background (202) — poll getCompanyReports until it ends
  async generateReport(companyId: string, type: ComparisonReportType): Promise<{ reportId: string; report: ComparisonReport }> {
    const response = await api.post(`/comparison-reports/generate/${companyId}`, { type });
    return response.data;
  },

  async getCompanyReports(companyId: string): Promise<ComparisonReport[]> {
    const response = await api.get(`/comparison-reports/company/${companyId}`);
    return response.data.reports;
  },

  async generateDownloadCode(reportId: string): Promise<void> {
    await api.post(`/comparison-reports/${reportId}/generate-code`);
  },

  async validateCode(reportId: string, code: string): Promise<boolean> {
    try {
      await api.post(`/comparison-reports/${reportId}/validate-code`, { code });
      return true;
    } catch {
      return false;
    }
  },

  async downloadReport(
    reportId: string,
    type: ComparisonReportType,
    format: 'pdf' | 'docx',
    companyName: string,
    forecastYear: number,
    downloadCode?: string,
  ): Promise<void> {
    const params: Record<string, string> = {};
    if (downloadCode) params.code = downloadCode;

    const response = await api.get(`/comparison-reports/${reportId}/download/${format}`, {
      responseType: 'blob',
      params,
    });

    const mime = format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const blob = new Blob([response.data], { type: mime });

    const typeSuffix = type === 'FORECAST_BUDGET_VS_ANNUAL' ? 'forecast_budget_vs_anual' : 'forecast_vs_anual';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TAXFIN_${companyName.replace(/\s+/g, '_')}_${forecastYear}_${typeSuffix}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Resumen ejecutivo (dashboard, semáforo, gráficos, alertas y recomendaciones) en PDF
  async downloadExecutiveSummary(
    reportId: string,
    type: ComparisonReportType,
    companyName: string,
    year: number,
  ): Promise<void> {
    const response = await api.get(`/comparison-reports/${reportId}/download/executive`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const typeSuffix = type === 'FORECAST_BUDGET_VS_ANNUAL' ? 'budget' : 'forecast';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TAXFIN_${companyName.replace(/\s+/g, '_')}_${year}_${typeSuffix}_resumen_ejecutivo.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
