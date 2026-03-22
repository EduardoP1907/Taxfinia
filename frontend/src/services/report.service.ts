import api from './api';

export interface Report {
  id: string;
  year: number;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  generatedAt: string | null;
  pdfPath: string | null;
  docxPath: string | null;
  hasDownloadCode: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export const reportService = {
  /**
   * Generate a new report (sync - waits for AI to finish)
   */
  async generateReport(companyId: string, year?: number): Promise<{ reportId: string; report: Report }> {
    const response = await api.post(`/reports/generate-sync/${companyId}`, { year });
    return response.data;
  },

  /**
   * Get all reports for a company
   */
  async getCompanyReports(companyId: string): Promise<Report[]> {
    const response = await api.get(`/reports/company/${companyId}`);
    return response.data.reports;
  },

  /**
   * Get a 15-minute preview token for the analysis PDF
   */
  async getPreviewToken(reportId: string): Promise<{ token: string; expiresIn: number }> {
    const response = await api.post(`/reports/${reportId}/preview-token`);
    return response.data;
  },

  /**
   * Build the inline preview URL from a token
   */
  getPreviewUrl(token: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${baseUrl}/reports/preview/${token}`;
  },

  /**
   * Generate a download code and send it to the admin email
   */
  async generateDownloadCode(reportId: string): Promise<void> {
    await api.post(`/reports/${reportId}/generate-code`);
  },

  /**
   * Validate a download code without downloading (returns true if valid)
   */
  async validateCode(reportId: string, code: string): Promise<boolean> {
    try {
      await api.post(`/reports/${reportId}/validate-code`, { code });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Download a report file with optional access code
   */
  async downloadReport(
    reportId: string,
    format: 'pdf' | 'docx',
    companyName: string,
    year: number,
    downloadCode?: string
  ): Promise<void> {
    const params: Record<string, string> = {};
    if (downloadCode) params.code = downloadCode;

    const response = await api.get(`/reports/${reportId}/download/${format}`, {
      responseType: 'blob',
      params,
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const suffix = format === 'pdf' ? 'tablas' : 'analisis';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TAXFIN_${companyName.replace(/\s+/g, '_')}_${year}_${suffix}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
