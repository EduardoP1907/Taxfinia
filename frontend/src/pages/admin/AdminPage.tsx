import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  ShieldCheck,
  Link2,
  Copy,
  Check,
  RefreshCw,
  Gift,
  Clock,
  CheckCircle2,
  Plus,
  Users,
} from 'lucide-react';

interface InviteToken {
  id: string;
  token: string;
  url: string;
  usedById: string | null;
  usedAt: string | null;
  createdAt: string;
}

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tokens, setTokens] = useState<InviteToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const loadTokens = useCallback(async () => {
    try {
      const res = await api.get('/auth/admin/invite-tokens');
      setTokens(res.data.tokens);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/auth/admin/invite-tokens');
      setTokens(prev => [{ ...res.data, usedById: null, usedAt: null, createdAt: new Date().toISOString() }, ...prev]);
    } catch {
      alert('Error al generar el token');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const available = tokens.filter(t => !t.usedById).length;
  const used = tokens.filter(t => t.usedById).length;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-900 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Panel de Administración</h1>
            <p className="text-sm text-slate-500">Gestión de invitaciones de prueba</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Disponibles</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{available}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Usados</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{used}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{tokens.length}</p>
          </div>
        </div>

        {/* Generate button */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Nuevo link de invitación</p>
              <p className="text-xs text-slate-500 mt-0.5">El usuario registrado obtendrá plan TRIAL con 2 informes gratuitos</p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generar link
            </button>
          </div>
        </div>

        {/* Tokens list */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Links generados</p>
            <button onClick={loadTokens} className="text-xs text-amber-500 hover:text-amber-700 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Actualizar
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-8 text-center">
              <Link2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No hay links generados aún</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tokens.map(token => (
                <div key={token.id} className="px-5 py-3 flex items-center gap-3">
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${token.usedById ? 'bg-slate-300' : 'bg-emerald-400'}`} />

                  {/* URL */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-600 truncate">{token.url}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {token.usedById ? (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Usado {token.usedAt ? new Date(token.usedAt).toLocaleDateString('es-CL') : ''}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <Clock className="w-3 h-3" />
                          Disponible
                        </span>
                      )}
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">
                        {new Date(token.createdAt).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  </div>

                  {/* Copy button — only if not used */}
                  {!token.usedById && (
                    <button
                      onClick={() => handleCopy(token.url, token.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex-shrink-0
                        text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50"
                    >
                      {copied === token.id ? (
                        <><Check className="w-3 h-3 text-emerald-500" /> Copiado</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copiar</>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
