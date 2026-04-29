import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setErrors({ submit: 'Completa todos los campos' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await authService.login(formData);
      setUser(response.user);
      navigate('/dashboard');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Error al iniciar sesión';
      if (msg.includes('no verificado')) {
        setErrors({ submit: msg, action: 'verify' });
      } else {
        setErrors({ submit: msg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = "w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm";

  return (
    <AuthLayout>
      <div className="mb-8">
        <p className="font-data text-[10px] text-amber-500/60 tracking-[0.2em] uppercase mb-2">/ Acceso</p>
        <h1 className="text-2xl font-bold text-white mb-1">Iniciar sesión</h1>
        <p className="text-slate-400 text-sm">Accede a tu plataforma de análisis financiero</p>
      </div>

      {errors.submit && (
        <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
          {errors.submit}
          {errors.action === 'verify' && (
            <div className="mt-2">
              <Link to="/verify-otp" state={{ email: formData.email }} className="text-amber-400 underline font-medium">
                Verificar cuenta ahora
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              autoComplete="email"
              required
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-amber-400 transition-colors">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={isLoading} size="lg">
          Iniciar Sesión
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Regístrate
        </Link>
      </p>
    </AuthLayout>
  );
};
