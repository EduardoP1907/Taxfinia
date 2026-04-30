import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import { Mail, Lock, User, Gift } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';

const RegisterPanelBody: React.FC = () => (
  <>
    <h2 className="text-3xl font-bold text-white mb-4 leading-tight text-pretty">
      Plataforma profesional de análisis y valoración financiera
    </h2>
    <p className="text-slate-400 text-sm leading-relaxed mb-8">
      Basada en la metodología TAXFINMHO, PROMETHEIA digitaliza el análisis económico-financiero completo — desde los estados financieros hasta la valoración DCF — con precisión institucional.
    </p>
    <div className="space-y-3">
      {[
        'Cálculo automático de 30+ ratios financieros',
        'Motor de proyecciones DCF y EVA',
        'Análisis de riesgo Altman & Springate',
        'Informes ejecutivos en PDF y Word',
      ].map((item) => (
        <div key={item} className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
          <span className="text-slate-400 text-sm">{item}</span>
        </div>
      ))}
    </div>
  </>
);

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';
  const [isTrialInvite, setIsTrialInvite] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`${import.meta.env.VITE_API_URL}/auth/invite-tokens/${inviteToken}/validate`, { credentials: 'omit' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.valid) setIsTrialInvite(true); })
      .catch(() => {});
  }, [inviteToken]);

  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', firstName: '', lastName: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'El email es requerido';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
    if (!formData.password) newErrors.password = 'La contraseña es requerida';
    else if (formData.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';
    if (!acceptedTerms) newErrors.terms = 'Debes aceptar los términos para continuar';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await authService.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        ...(inviteToken ? { inviteToken } : {}),
      });
      setSuccessMessage('¡Registro exitoso! Revisa tu email para el código de verificación.');
      setTimeout(() => navigate('/verify-otp', { state: { email: formData.email } }), 2000);
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.error || 'Error al registrar usuario' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = "w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm";
  const inputErrCls = "w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-red-500/60 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-colors text-sm";

  return (
    <AuthLayout panelBody={<RegisterPanelBody />}>
      <div className="py-2">
        <div className="mb-7">
          <p className="font-data text-[10px] text-amber-500/60 tracking-[0.2em] uppercase mb-2">/ Registro</p>
          <h1 className="text-2xl font-bold text-white mb-1">Crear cuenta</h1>
          <p className="text-slate-400 text-sm">Accede a la plataforma de análisis financiero</p>
          {isTrialInvite && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Gift className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-300 font-medium">Invitación activa — 2 informes gratuitos incluidos</p>
            </div>
          )}
        </div>

        {successMessage && (
          <div className="mb-5 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm">
            {successMessage}
          </div>
        )}
        {errors.submit && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Nombre</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Juan" autoComplete="given-name" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Apellido</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Pérez" autoComplete="family-name" className={inputCls} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="tu@email.com" autoComplete="email" required className={errors.email ? inputErrCls : inputCls} />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" autoComplete="new-password" required className={errors.password ? inputErrCls : inputCls} />
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Confirmar Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" autoComplete="new-password" required className={errors.confirmPassword ? inputErrCls : inputCls} />
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
          </div>

          <div className="flex flex-col gap-1 pt-1">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => { setAcceptedTerms(e.target.checked); setErrors(prev => ({ ...prev, terms: '' })); }}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/30 cursor-pointer"
              />
              <span className="text-sm text-slate-400">
                Acepto los{' '}
                <a href="/contrato.pdf" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">
                  términos y condiciones
                </a>
              </span>
            </label>
            {errors.terms && <p className="text-xs text-red-400">{errors.terms}</p>}
          </div>

          <Button type="submit" className="w-full mt-1" isLoading={isLoading} size="lg">
            Crear Cuenta
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};
