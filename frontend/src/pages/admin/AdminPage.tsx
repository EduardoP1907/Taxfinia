import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import api from '../../services/api';
import { AdminUsersSection } from '../../components/admin/AdminUsersSection';
import {
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
  consolidatedYears?: number[];
  createdAt: string;
}

// Las rutas /admin/* exigen rol ADMIN (PrivateRoute requireAdmin)

const AdminHeader: React.FC<{ icon: React.ElementType; title: string; subtitle: string }> = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="p-2 bg-slate-900 rounded-xl">
      <Icon className="w-5 h-5 text-amber-400" aria-hidden="true" />
    </div>
    <div>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  </div>
);

// ── Usuarios ────────────────────────────────────────────────────────────────

export const AdminUsersPage: React.FC = () => (
  <DashboardLayout>
    <div className="max-w-4xl mx-auto">
      <AdminHeader icon={Users} title="Usuarios" subtitle="Habilitación de cuentas, suscripciones y exenciones" />
      <AdminUsersSection />
    </div>
  </DashboardLayout>
);

// ── Empresas ────────────────────────────────────────────────────────────────

export const AdminCompaniesPage: React.FC = () => {
  const [allCompanies, setAllCompanies] = useState<AdminCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadAllCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    try {
      const res = await api.get('/companies/admin/all');
      setAllCompanies(res.data.data);
    } catch {
      setActionError('No se pudieron cargar las empresas. Pulsa «Actualizar» para reintentar.');
    } finally {
      setCompaniesLoading(false);
    }
  }, []);

  useEffect(() => { loadAllCompanies(); }, [loadAllCompanies]);

  const handleUnlock = async (companyId: string) => {
    setUnlocking(companyId);
    setActionError(null);
    try {
      await api.post(`/companies/${companyId}/unlock`);
      setAllCompanies(prev => prev.map(c => c.id === companyId ? { ...c, isLocked: false, consolidatedYears: [] } : c));
    } catch {
      setActionError('No se pudo habilitar la edición de la empresa. Inténtalo de nuevo.');
    } finally {
      setUnlocking(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <AdminHeader icon={Building2} title="Empresas" subtitle="Ejercicios consolidados y habilitación de edición" />

        {actionError && (
          <p role="alert" className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{actionError}</p>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-800">Empresas y ejercicios consolidados</h2>
            </div>
            <button type="button" onClick={loadAllCompanies} className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" aria-hidden="true" /> Actualizar
            </button>
          </div>

          {companiesLoading ? (
            <div className="p-8 flex justify-center" role="status">
              <RefreshCw className="w-5 h-5 text-slate-400 motion-safe:animate-spin" aria-hidden="true" />
              <span className="sr-only">Cargando empresas…</span>
            </div>
          ) : allCompanies.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
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
                      {company.consolidatedYears && company.consolidatedYears.length > 0 && (
                        <span className="text-xs text-slate-500">· Solo lectura: {company.consolidatedYears.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {company.isLocked ? (
                      <button
                        type="button"
                        onClick={() => handleUnlock(company.id)}
                        disabled={unlocking === company.id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors text-red-600 border-red-200 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {unlocking === company.id
                          ? <RefreshCw className="w-3 h-3 motion-safe:animate-spin" aria-hidden="true" />
                          : <LockOpen className="w-3 h-3" aria-hidden="true" />
                        }
                        {unlocking === company.id ? 'Habilitando…' : 'Habilitar edición'}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <Lock className="w-3 h-3 opacity-30" aria-hidden="true" />
                        Editable
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// ── Invitaciones ────────────────────────────────────────────────────────────

export const AdminInvitesPage: React.FC = () => {
  const [tokens, setTokens] = useState<InviteToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [recipientNote, setRecipientNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

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
    setActionError(null);
    try {
      const res = await api.post('/auth/admin/invite-tokens', { recipientNote: recipientNote.trim() || undefined });
      setTokens(prev => [{ ...res.data, usedById: null, usedAt: null, createdAt: new Date().toISOString() }, ...prev]);
      setRecipientNote('');
    } catch {
      setActionError('No se pudo generar el link de invitación. Inténtalo de nuevo.');
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
      <div className="max-w-4xl mx-auto">
        <AdminHeader icon={Link2} title="Invitaciones" subtitle="Links de prueba (plan TRIAL)" />

        {actionError && (
          <p role="alert" className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{actionError}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-emerald-500" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Disponibles</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{available}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-blue-500" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Usados</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{used}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{tokens.length}</p>
          </div>
        </div>

        {/* Generate button */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <div className="mb-3">
            <p className="text-sm font-semibold text-slate-800">Nuevo link de invitación</p>
            <p className="text-xs text-slate-500 mt-0.5">
              El usuario registrado obtendrá plan TRIAL con 2 informes gratuitos. Su cuenta queda deshabilitada hasta que la habilites en «Usuarios».
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label htmlFor="invite-recipient" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Para (destinatario)</label>
              <input
                id="invite-recipient"
                name="recipient"
                autoComplete="off"
                type="text"
                value={recipientNote}
                onChange={e => setRecipientNote(e.target.value)}
                placeholder="Nombre o email del destinatario…"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors mt-4 flex-shrink-0"
            >
              {generating ? <RefreshCw className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
              Generar link
            </button>
          </div>
        </div>

        {/* Tokens list */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Links generados</p>
            <button type="button" onClick={loadTokens} className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" aria-hidden="true" /> Actualizar
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center" role="status">
              <RefreshCw className="w-5 h-5 text-slate-400 motion-safe:animate-spin" aria-hidden="true" />
              <span className="sr-only">Cargando invitaciones…</span>
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-8 text-center">
              <Link2 className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-slate-500">No hay links generados aún</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tokens.map(token => (
                <div key={token.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${token.usedById ? 'bg-slate-300' : 'bg-emerald-400'}`} />

                  <div className="flex-1 min-w-0">
                    {token.recipientNote && (
                      <p className="text-xs font-semibold text-slate-700 truncate mb-0.5">→ {token.recipientNote}</p>
                    )}
                    <p className="text-xs font-mono text-slate-600 truncate">{token.url}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {token.usedById ? (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          Usado {token.usedAt ? new Date(token.usedAt).toLocaleDateString('es-CL') : ''}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          Disponible
                        </span>
                      )}
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">
                        {new Date(token.createdAt).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  </div>

                  {/* Copiar — solo si no se ha usado */}
                  {!token.usedById && (
                    <button
                      type="button"
                      onClick={() => handleCopy(token.url, token.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex-shrink-0
                        text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50"
                    >
                      {copied === token.id ? (
                        <><Check className="w-3 h-3 text-emerald-500" aria-hidden="true" /> Copiado</>
                      ) : (
                        <><Copy className="w-3 h-3" aria-hidden="true" /> Copiar</>
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
