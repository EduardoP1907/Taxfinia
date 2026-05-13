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
  Building2,
  Lock,
  LockOpen,
} from 'lucide-react';

interface InviteToken {
  id: string;
  token: string;
  url: string;
  recipientNote: string | null;
  usedById: string | null;
  usedAt: string | null;
  createdAt: string;
}

interface AdminCompany {
  id: string;
  name: string;
  taxId: string | null;
  isLocked: boolean;
  createdAt: string;
}

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tokens, setTokens] = useState<InviteToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [recipientNote, setRecipientNote] = useState('');

  const [allCompanies, setAllCompanies] = useState<AdminCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);

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

  const loadAllCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    try {
      const res = await api.get('/companies/admin/all');
      setAllCompanies(res.data.data);
    } catch {
      // silently fail
    } finally {
      setCompaniesLoading(false);
    }
  }, []);

  useEffect(() => { loadAllCompanies(); }, [loadAllCompanies]);

  const handleUnlock = async (companyId: string) => {
    setUnlocking(companyId);
    try {
      await api.post(`/companies/${companyId}/unlock`);
      setAllCompanies(prev => prev.map(c => c.id === companyId ? { ...c, isLocked: false } : c));
    } catch {
      alert('Error al desbloquear la empresa');
    } finally {
      setUnlocking(null);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/auth/admin/invite-tokens', { recipientNote: recipientNote.trim() || undefined });
      setTokens(prev => [{ ...res.data, usedById: null, usedAt: null, createdAt: new Date().toISOString() }, ...prev]);
      setRecipientNote('');
    } catch {
      alert('Error al generar el token');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (url: string, id: string) => {
    const doCopy = () => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(doCopy).catch(() => fallbackCopy(url, doCopy));
    } else {
      fallbackCopy(url, doCopy);
    }
  };

  const fallbackCopy = (text: string, onSuccess: () => void) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try { document.execCommand('copy'); onSuccess(); } catch {}
    document.body.removeChild(el);
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
          <div className="mb-3">
            <p className="text-sm font-semibold text-slate-800">Nuevo link de invitación</p>
            <p className="text-xs text-slate-500 mt-0.5">El usuario registrado obtendrá plan TRIAL con 2 informes gratuitos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Para (destinatario)</label>
              <input
                type="text"
                value={recipientNote}
                onChange={e => setRecipientNote(e.target.value)}
                placeholder="Nombre o email del destinatario"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors mt-4 flex-shrink-0"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generar link
            </button>
          </div>
        </div>

        {/* Companies lock management */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-800">Gestión de Empresas</p>
            </div>
            <button onClick={loadAllCompanies} className="text-xs text-amber-500 hover:text-amber-700 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Actualizar
            </button>
          </div>

          {companiesLoading ? (
            <div className="p-8 flex justify-center">
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : allCompanies.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No hay empresas registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {allCompanies.map(company => (
                <div key={company.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${company.isLocked ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{company.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {company.taxId && <span className="text-xs text-slate-400 font-mono">{company.taxId}</span>}
                      <span className="text-xs text-slate-400">{new Date(company.createdAt).toLocaleDateString('es-CL')}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {company.isLocked ? (
                      <button
                        onClick={() => handleUnlock(company.id)}
                        disabled={unlocking === company.id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors text-red-600 border-red-200 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {unlocking === company.id
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <LockOpen className="w-3 h-3" />
                        }
                        {unlocking === company.id ? 'Desbloqueando…' : 'Desbloquear'}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <Lock className="w-3 h-3 opacity-30" />
                        Libre
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                    {token.recipientNote && (
                      <p className="text-xs font-semibold text-slate-700 truncate mb-0.5">→ {token.recipientNote}</p>
                    )}
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
