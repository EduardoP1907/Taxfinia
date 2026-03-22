export interface Company {
  id: string;
  name: string;
  taxId?: string;
  industry?: string;
  country?: string;
  description?: string;
  website?: string;
  employees?: number;
  foundedYear?: number;
  baseYear: number;
  currency?: string;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyData {
  name: string;
  taxId?: string;
  industry?: string;
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
