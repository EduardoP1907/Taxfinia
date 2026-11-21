export type CompanySize = 'LARGE' | 'MEDIUM' | 'SMALL';

/**
 * Año de trabajo de la empresa, según su último ejercicio anual cerrado (L):
 * informe anual = L, Forecast = L+1, Budget = L+2. Lo calcula el backend.
 */
export interface YearContext {
  lastClosedYear: number | null;
  reportYear: number | null;
  forecastYear: number | null;
  budgetYear: number | null;
  latestClosableYear: number;   // año actual − 1 (último que ya puede cerrarse)
  needsClosing: boolean;        // sin ejercicio cerrado o L < año actual − 2
}

export interface Company {
  id: string;
  name: string;
  taxId?: string;
  industry?: string;
  companySize?: CompanySize;
  country?: string;
  description?: string;
  website?: string;
  employees?: number;
  foundedYear?: number;
  baseYear: number;
  currency?: string;
  isLocked?: boolean;
  isEnabled?: boolean;               // false = deshabilitada por el admin (no se puede abrir)
  deedDocumentName?: string;
  deedDocumentUploadedAt?: string;
  // PROCESSING = escritura escaneada en lectura (OCR) en segundo plano
  deedDocumentStatus?: 'PROCESSING' | 'READY' | 'FAILED' | null;
  deedDocumentError?: string | null;
  yearContext?: YearContext;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyData {
  name: string;
  taxId?: string;
  industry?: string;
  companySize?: CompanySize;
  country?: string;
  description?: string;
  website?: string;
  employees?: number;
  foundedYear?: number;
  baseYear: number;
  currency?: string;
}

export interface UpdateCompanyData {
  name?: string;
  taxId?: string;
  industry?: string;
  companySize?: CompanySize;
  country?: string;
  description?: string;
  website?: string;
  employees?: number;
  foundedYear?: number;
  baseYear?: number;
  currency?: string;
}

export interface CompanySummary {
  company: Company;
  fiscalYearsCount: number;
  balanceSheetsCount: number;
  incomeStatementsCount: number;
  lastUpdated: string;
}
