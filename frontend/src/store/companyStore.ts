import { create } from 'zustand';
import type { Company } from '../types/company';

interface CompanyState {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  selectedCompany: null,
  setSelectedCompany: (company) => set({ selectedCompany: company }),
}));
