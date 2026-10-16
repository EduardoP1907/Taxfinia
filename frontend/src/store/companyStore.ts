import { create } from 'zustand';
import type { Company } from '../types/company';
import { companyService } from '../services/company.service';

// Última empresa usada, recordada por usuario (clave por userId para que dos
// cuentas en el mismo navegador no se mezclen).
const lastKey = (userId: string) => `lastCompanyId:${userId}`;

interface CompanyState {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;

  // Empresa activa que el menú usa para no pedir la selección en cada pestaña
  activeCompanyId: string | null;
  activeCompanyName: string | null;
  companies: Company[] | null;          // cache de la lista (null = sin cargar)
  loadedForUser: string | null;
  initActiveCompany: (userId: string) => Promise<void>;
  rememberCompany: (userId: string, companyId: string) => void;
  forgetCompany: (userId: string) => void;
  invalidateCompanies: () => void;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  selectedCompany: null,
  setSelectedCompany: (company) => set({ selectedCompany: company }),

  activeCompanyId: null,
  activeCompanyName: null,
  companies: null,
  loadedForUser: null,

  // Carga la lista una vez por usuario y valida la empresa recordada: si ya no
  // existe se descarta; si el usuario tiene una sola empresa, se usa esa.
  initActiveCompany: async (userId) => {
    if (get().loadedForUser === userId && get().companies !== null) return;
    set({ loadedForUser: userId });
    try {
      const companies = await companyService.getCompanies();
      const stored = localStorage.getItem(lastKey(userId));
      // Una empresa deshabilitada por el admin no puede ser la activa
      const usable = companies.filter(c => c.isEnabled !== false);
      const match =
        usable.find(c => c.id === (get().activeCompanyId ?? stored)) ??
        (usable.length === 1 ? usable[0] : undefined);
      if (match) localStorage.setItem(lastKey(userId), match.id);
      else localStorage.removeItem(lastKey(userId));
      set({
        companies,
        activeCompanyId: match?.id ?? null,
        activeCompanyName: match?.name ?? null,
      });
    } catch {
      set({ loadedForUser: null }); // reintenta en la próxima navegación
    }
  },

  rememberCompany: (userId, companyId) => {
    if (get().activeCompanyId === companyId) return;
    const companies = get().companies;
    const match = companies?.find(c => c.id === companyId);
    // Empresa desconocida (p. ej. recién creada): recargar la lista para validarla
    if (companies && !match) {
      set({ activeCompanyId: companyId, activeCompanyName: null, companies: null });
      get().initActiveCompany(userId);
      return;
    }
    localStorage.setItem(lastKey(userId), companyId);
    set({ activeCompanyId: companyId, activeCompanyName: match?.name ?? null });
  },

  forgetCompany: (userId) => {
    localStorage.removeItem(lastKey(userId));
    set({ activeCompanyId: null, activeCompanyName: null });
  },

  invalidateCompanies: () => set({ companies: null }),
}));
