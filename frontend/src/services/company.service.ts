import api from './api';
import type { Company, CreateCompanyData, UpdateCompanyData, CompanySummary } from '../types/company';

export const companyService = {
  async createCompany(data: CreateCompanyData): Promise<Company> {
    const response = await api.post('/companies', data);
    return response.data.data;
  },

  async getCompanies(): Promise<Company[]> {
    const response = await api.get('/companies');
    return response.data.data;
  },

  async getCompany(id: string): Promise<Company> {
    const response = await api.get(`/companies/${id}`);
    return response.data.data;
  },

  async getCompanyById(id: string): Promise<Company> {
    const response = await api.get(`/companies/${id}`);
    return response.data.data;
  },

  async updateCompany(id: string, data: UpdateCompanyData): Promise<Company> {
    const response = await api.put(`/companies/${id}`, data);
    return response.data.data;
  },

  async deleteCompany(id: string): Promise<void> {
    await api.delete(`/companies/${id}`);
  },

  async getCompanySummary(id: string): Promise<CompanySummary> {
    const response = await api.get(`/companies/${id}/summary`);
    return response.data.data;
  },

  async getDashboardStats(): Promise<{ companyCount: number; reportCount: number; analysisCount: number }> {
    const response = await api.get('/companies/stats');
    return response.data.data;
  },

  /** PROCESSING = escritura escaneada: la lectura (OCR) sigue en segundo plano */
  async uploadDeedDocument(id: string, file: File): Promise<'PROCESSING' | 'READY'> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/companies/${id}/deed-document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.data?.status === 'PROCESSING' ? 'PROCESSING' : 'READY';
  },

  async deleteDeedDocument(id: string): Promise<void> {
    await api.delete(`/companies/${id}/deed-document`);
  },
};
