import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock, Flame } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
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
      const errorMessage = error.response?.data?.error || 'Error al iniciar sesión';

      if (errorMessage.includes('no verificado')) {
        setErrors({
          submit: errorMessage,
          action: 'verify',
        });
      } else {
        setErrors({ submit: errorMessage });
      }
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
          <div className="space-y-4">
            {[
              'Análisis económico-financiero profesional',
              'Valoración de empresas por múltiples metodologías',
              'Proyecciones y modelos DCF avanzados',
              'Informes ejecutivos generados con IA',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                <span className="text-slate-400 text-sm">{item}</span>
              </div>
            ))}
          </div>
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

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Iniciar sesión</h1>
            <p className="text-slate-400 text-sm">Accede a tu plataforma de análisis financiero</p>
          </div>

          {errors.submit && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
              {errors.submit}
              {errors.action === 'verify' && (
                <div className="mt-2">
                  <Link
                    to="/verify-otp"
                    state={{ email: formData.email }}
                    className="text-amber-400 underline font-medium"
                  >
                    Verificar cuenta ahora
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm"
                />
              </div>
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
        </div>
      </div>
    </div>
  );
};
