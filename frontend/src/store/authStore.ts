import { create } from 'zustand';
import type { User } from '../types/auth';
import { authService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  refreshUser: (force?: boolean) => Promise<void>;
}

let lastUserRefresh = 0;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  // Actualiza el usuario desde el servidor (vigencia, exención, ventana de años).
  // El usuario restaurado de localStorage puede estar desactualizado.
  refreshUser: async (force = false) => {
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') return;
    if (!localStorage.getItem('accessToken')) return;
    if (!force && Date.now() - lastUserRefresh < 60_000) return;
    lastUserRefresh = Date.now();
    try {
      const user = await authService.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch { /* el interceptor de 401 ya gestiona sesiones inválidas */ }
  },

  logout: async () => {
    await authService.logout();
    lastUserRefresh = 0;
    set({ user: null, isAuthenticated: false });
  },

  initializeAuth: async () => {
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      set({
        user: {
          id: 'dev-user',
          email: 'dev@local.com',
          firstName: 'Dev',
          lastName: 'Local',
          // Admin y usuario tienen áreas separadas: VITE_DEV_BYPASS_ROLE=ADMIN para ver el panel admin
          role: import.meta.env.VITE_DEV_BYPASS_ROLE === 'ADMIN' ? 'ADMIN' : 'ANALYST',
          isVerified: true,
          createdAt: new Date().toISOString(),
          privileged: true,
          subscriptionActive: true,
        },
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    // No token — mark as unauthenticated immediately, no network call needed
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    // Token exists — restore from localStorage (instant)
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true, isLoading: false });
        return;
      } catch {
        // corrupted user JSON — fall through to /auth/me
      }
    }

    // Token exists but no user data — validate with server
    try {
      const user = await authService.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
