export type CompanySize = 'LARGE' | 'MEDIUM' | 'SMALL';

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
