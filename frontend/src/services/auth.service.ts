import api from './api';
import type { AuthResponse, RegisterData, LoginData, VerifyOtpData, User } from '../types/auth';

export const authService = {
  async register(data: RegisterData): Promise<{ userId: string; email: string; message: string }> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async verifyOtp(data: VerifyOtpData): Promise<AuthResponse> {
    const response = await api.post('/auth/verify-otp', data);
    const { user, accessToken, refreshToken } = response.data;

    // Store tokens for Authorization header fallback (HTTP cross-origin production)
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    return response.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    const { user, accessToken, refreshToken } = response.data;

    // Store tokens for Authorization header fallback (HTTP cross-origin production)
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    return response.data;
  },

  async resendOtp(email: string): Promise<{ message: string }> {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post('/auth/reset-password', { email, code, newPassword });
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },
};
