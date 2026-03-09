import api from './api';

export interface Report {
  id: string;
  year: number;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  generatedAt: string | null;
  pdfPath: string | null;
  docxPath: string | null;
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
   * Get download URL for a report
   */
  getDownloadUrl(reportId: string, format: 'pdf' | 'docx'): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${baseUrl}/reports/${reportId}/download/${format}`;
  },

  /**
   * Download a report file with auth token
   */
  async downloadReport(reportId: string, format: 'pdf' | 'docx', companyName: string, year: number): Promise<void> {
    const response = await api.get(`/reports/${reportId}/download/${format}`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TAXFIN_${companyName.replace(/\s+/g, '_')}_${year}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
