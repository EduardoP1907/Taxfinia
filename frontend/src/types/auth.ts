export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER' | 'CLIENT';
  isVerified: boolean;
  planType?: string;
  freeReportsUsed?: number;
  createdAt: string;
  // Suscripción y acceso (vienen de /auth/me)
  isActive?: boolean;
  isExempt?: boolean;
  privileged?: boolean;              // ADMIN o exento: sin vencimiento ni bloqueos
  maxCompanies?: number;             // cupo de empresas habilitado por el admin (no aplica a privilegiados)
  subscriptionEndsAt?: string | null;
  subscriptionActive?: boolean;      // false = modo solo lectura
  annualYearWindow?: { min: number; max: number }; // años anuales editables
}

export interface AuthResponse {
  user: User;
  accessToken?: string;
  refreshToken?: string;
}

/** verify-otp de una cuenta que el admin aún no habilita: no abre sesión */
export interface PendingActivationResponse {
  pendingActivation: true;
  message: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  inviteToken?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyOtpData {
  email: string;
  code: string;
}
