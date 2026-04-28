import { create } from 'zustand';
import type { User } from '../types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initializeAuth: () => void;
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

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  initializeAuth: () => {
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

    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');

    if (userStr && token) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true, isLoading: false });
      } catch (error) {
        console.error('Error al parsear usuario:', error);
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
