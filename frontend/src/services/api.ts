import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send httpOnly cookies when available (HTTPS same-origin)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT from localStorage as Authorization header (fallback for HTTP cross-origin production)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// On 401, clear local state and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Suscripción vencida: refrescar el usuario para que la interfaz pase a
    // modo solo lectura (import dinámico para evitar dependencia circular)
    if (error.response?.status === 403 && error.response?.data?.subscriptionExpired) {
      import('../store/authStore').then(m => m.useAuthStore.getState().refreshUser(true));
    }
    // Empresa deshabilitada por el admin: olvidarla como activa y volver a «Mis Empresas»
    if (error.response?.status === 403 && error.response?.data?.companyDisabled) {
      import('../store/companyStore').then(({ useCompanyStore }) => {
        const userId = JSON.parse(localStorage.getItem('user') || 'null')?.id;
        if (userId) useCompanyStore.getState().forgetCompany(userId);
        useCompanyStore.getState().invalidateCompanies();
        if (!window.location.pathname.startsWith('/empresas')) window.location.href = '/empresas';
      });
    }
    if (error.response?.status === 401 && !error.response?.data?.requiresCode) {
      const publicRoutes = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'];
      const isPublicRoute = publicRoutes.some(r => window.location.pathname.startsWith(r));
      if (!isPublicRoute) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        // Cuenta deshabilitada por el admin: el login muestra el motivo
        window.location.href = error.response?.data?.accountDisabled ? '/login?cuenta=deshabilitada' : '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
