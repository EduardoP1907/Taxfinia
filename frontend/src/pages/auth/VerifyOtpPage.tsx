import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { ShieldCheck } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';

export const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);

  const email = location.state?.email || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!email) navigate('/register');
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1 || (value && !/^\d$/.test(value))) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pasted)) return;
    const newCode = pasted.split('');
    while (newCode.length < 6) newCode.push('');
    setCode(newCode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = code.join('');
    if (otpCode.length !== 6) { setError('Ingresa el código completo'); return; }
    setIsLoading(true);
    try {
      const response = await authService.verifyOtp({ email, code: otpCode });
      setUser(response.user);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Código inválido');
      setCode(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authService.resendOtp(email);
      setCanResend(false);
      setCountdown(60);
      setError('');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error al reenviar código');
    }
  };

  return (
    <AuthLayout>
      <div className="mb-8 text-center">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-7 h-7 text-amber-400" />
        </div>
        <p className="font-data text-[10px] text-amber-500/60 tracking-[0.2em] uppercase mb-2">/ Verificación</p>
        <h1 className="text-2xl font-bold text-white mb-2">Verifica tu email</h1>
        <p className="text-slate-400 text-sm">
          Hemos enviado un código de 6 dígitos a<br />
          <span className="font-medium text-slate-200">{email}</span>
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              autoComplete="off"
              className="w-11 h-[52px] text-center text-xl font-bold bg-slate-800 border-2 border-slate-700 text-white rounded-lg focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors tabular-nums"
            />
          ))}
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
          Verificar Código
        </Button>

        <div className="text-center">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="text-amber-400 hover:text-amber-300 font-medium text-sm transition-colors focus-visible:ring-1 focus-visible:ring-amber-500 rounded"
            >
              Reenviar código
            </button>
          ) : (
            <p className="text-slate-500 text-sm">
              Reenviar código en <span className="text-slate-300 font-data tabular-nums">{countdown}s</span>
            </p>
          )}
        </div>
      </form>

      <div className="mt-6 text-center">
        <Link to="/register" className="text-sm text-slate-500 hover:text-amber-400 transition-colors">
          ← Volver al registro
        </Link>
      </div>
    </AuthLayout>
  );
};
