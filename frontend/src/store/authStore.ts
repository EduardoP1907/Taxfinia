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
}

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

  logout: async () => {
    await authService.logout();
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
          role: 'ADMIN',
          isVerified: true,
          createdAt: new Date().toISOString(),
        },
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    // Try to restore from localStorage first (instant, no network)
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true, isLoading: false });
        return;
      } catch {
        // corrupted data — fall through to /auth/me
      }
    }

    // Validate session via cookie or token (handles page refresh without localStorage)
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
