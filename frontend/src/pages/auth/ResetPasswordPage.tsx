import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import { Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = (location.state as { email?: string })?.email || '';

  const [formData, setFormData] = useState({
    email: emailFromState, code: '', newPassword: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.code || !formData.newPassword || !formData.confirmPassword) {
      setError('Completa todos los campos');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (formData.newPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setIsLoading(true);
    try {
      await authService.resetPassword(formData.email, formData.code, formData.newPassword);
      navigate('/login', { state: { message: 'Contraseña actualizada. Inicia sesión.' } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Código inválido o expirado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!formData.email) return;
    try { await authService.forgotPassword(formData.email); setError(''); } catch { /* silencioso */ }
  };

  const inputCls = "w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm";

  return (
    <AuthLayout>
      <Link
        to="/forgot-password"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </Link>

      <div className="mb-8">
        <p className="font-data text-[10px] text-amber-500/60 tracking-[0.2em] uppercase mb-2">/ Nueva contraseña</p>
        <h1 className="text-2xl font-bold text-white mb-1">Restablecer contraseña</h1>
        <p className="text-slate-400 text-sm">
          Introduce el código enviado a tu email y elige una nueva contraseña.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!emailFromState && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="tu@email.com" autoComplete="email" required
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Código de verificación</label>
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="000000"
            maxLength={6}
            autoComplete="one-time-code"
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm tracking-widest font-mono text-center"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            ¿No recibiste el código?{' '}
            <button type="button" onClick={handleResend} className="text-amber-400 hover:text-amber-300 transition-colors focus-visible:ring-1 focus-visible:ring-amber-500 rounded">
              Reenviar
            </button>
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Nueva contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
              className="w-full pl-9 pr-10 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus-visible:ring-1 focus-visible:ring-amber-500 rounded"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Confirmar contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              required
              className={inputCls}
            />
          </div>
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={isLoading} size="lg">
          Cambiar Contraseña
        </Button>
      </form>
    </AuthLayout>
  );
};
