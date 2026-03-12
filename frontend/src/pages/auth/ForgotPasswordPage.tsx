import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import { Mail, Flame, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Introduce tu email');
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      navigate('/reset-password', { state: { email } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar el código');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
            <Flame className="w-5 h-5 text-slate-900" />
          </div>
          <span className="font-bold text-xl text-white tracking-wider">PROMETHEIA</span>
        </div>

        <div>
          <blockquote className="text-slate-300 text-xl font-light leading-relaxed mb-6">
            "El conocimiento financiero es la antorcha que ilumina el camino de las mejores decisiones."
          </blockquote>
        </div>

        <p className="text-slate-600 text-sm">
          © {new Date().getFullYear()} PROMETHEIA · Todos los derechos reservados
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
              <Flame className="w-5 h-5 text-slate-900" />
            </div>
            <span className="font-bold text-xl text-white tracking-wider">PROMETHEIA</span>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al login
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Recuperar contraseña</h1>
            <p className="text-slate-400 text-sm">
              Introduce tu email y te enviaremos un código de verificación.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="tu@email.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm"
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isLoading} size="lg">
              Enviar código
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
