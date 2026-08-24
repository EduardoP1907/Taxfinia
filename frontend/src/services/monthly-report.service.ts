import api from './api';

export type MonthlyReportVariant = 'prometheia' | 'ejecutivo';

export interface MonthlyReport {
  id: string;
  year: number;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  generatedAt: string | null;
  docxPathPrometheia: string | null;
  docxPathEjecutivo: string | null;
  hasDownloadCode: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export const monthlyReportService = {
  /**
   * Generate the two monthly AI reports (Prometheia + Ejecutivo), sync
   */
  async generateReport(companyId: string, year: number): Promise<{ reportId: string; report: MonthlyReport }> {
    const response = await api.post(`/monthly-reports/generate-sync/${companyId}`, { year });
    return response.data;
  },

  async getCompanyReports(companyId: string): Promise<MonthlyReport[]> {
    const response = await api.get(`/monthly-reports/company/${companyId}`);
    return response.data.reports;
  },

  async generateDownloadCode(reportId: string): Promise<void> {
    await api.post(`/monthly-reports/${reportId}/generate-code`);
  },

  async validateCode(reportId: string, code: string): Promise<boolean> {
    try {
      await api.post(`/monthly-reports/${reportId}/validate-code`, { code });
      return true;
    } catch {
      return false;
    }
  },

  async downloadReport(
    reportId: string,
    variant: MonthlyReportVariant,
    format: 'pdf' | 'docx',
    companyName: string,
    year: number,
    downloadCode?: string,
  ): Promise<void> {
    const params: Record<string, string> = {};
    if (downloadCode) params.code = downloadCode;

    const response = await api.get(`/monthly-reports/${reportId}/download/${variant}/${format}`, {
      responseType: 'blob',
      params,
    });

    const mime = format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const blob = new Blob([response.data], { type: mime });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TAXFIN_${companyName.replace(/\s+/g, '_')}_${year}_forecast_${variant}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
