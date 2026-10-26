import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Users, CalendarCheck, ShieldCheck, Power, Trash2, AlertTriangle, ChevronDown, Building2, Minus, Plus } from 'lucide-react';
import api from '../../services/api';
import { formatDateCL } from '../../hooks/useAccess';

interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  isExempt: boolean;
  maxCompanies: number;
  privileged: boolean;
  subscriptionEndsAt: string | null;
  subscriptionActive: boolean;
  createdAt: string;
  companies: AdminUserCompany[];
}

interface AdminUserCompany {
  id: string;
  name: string;
  taxId: string | null;
  industry: string | null;
  country: string;
  currency: string;
  isEnabled: boolean;
  createdAt: string;
  annualYears: number[];
  consolidatedYears: number[];
  reportCount: number;
}

type Filter = 'all' | 'disabled' | 'expired' | 'active';

/**
 * Gestión de cuentas: habilitación (toda cuenta nueva parte deshabilitada),
 * vigencia hasta el 31-dic, renovación tras el pago y cuentas exentas
 * (sin vencimiento ni bloqueo de ejercicios).
 */
export const AdminUsersSection: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const now = new Date();
  const cy = now.getFullYear();
  const isDecember = now.getMonth() === 11;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data);
    } catch {
      setError('No se pudieron cargar los usuarios. Pulsa «Actualizar» para reintentar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const renew = async (u: AdminUser, year: number) => {
    setBusy(u.id);
    setError(null);
    try {
      await api.post(`/admin/users/${u.id}/renew`, { year });
      await load();
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || `No se pudo renovar a ${u.email}.`);
    } finally {
      setBusy(null);
    }
  };

  const toggleExempt = async (u: AdminUser) => {
    setBusy(u.id);
    setError(null);
    try {
      await api.put(`/admin/users/${u.id}/exempt`, { isExempt: !u.isExempt });
      await load();
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || `No se pudo actualizar a ${u.email}.`);
    } finally {
      setBusy(null);
    }
  };

  const setMaxCompanies = async (u: AdminUser, maxCompanies: number) => {
    setBusy(u.id);
    setError(null);
    try {
      await api.put(`/admin/users/${u.id}/max-companies`, { maxCompanies });
      // Actualización local: no recarga la lista para no cerrar el desplegable
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, maxCompanies } : x));
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || `No se pudo actualizar el cupo de ${u.email}.`);
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (u: AdminUser) => {
    setBusy(u.id);
    setError(null);
    try {
      await api.put(`/admin/users/${u.id}/active`, { isActive: !u.isActive });
      await load();
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || `No se pudo actualizar a ${u.email}.`);
    } finally {
      setBusy(null);
    }
  };

  const [toDelete, setToDelete] = useState<AdminUser | null>(null);

  // Usuarios con más de una empresa: desplegable con el detalle de cada una
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (userId: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(userId)) next.delete(userId); else next.add(userId);
    return next;
  });

  const toggleCompany = async (c: AdminUserCompany) => {
    setBusy(c.id);
    setError(null);
    try {
      await api.put(`/admin/companies/${c.id}/enabled`, { isEnabled: !c.isEnabled });
      // Actualización local: no recarga la lista para no cerrar el desplegable
      setUsers(prev => prev.map(u => ({
        ...u,
        companies: u.companies.map(x => x.id === c.id ? { ...x, isEnabled: !c.isEnabled } : x),
      })));
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || `No se pudo actualizar la empresa ${c.name}.`);
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = async (u: AdminUser) => {
    setBusy(u.id);
    setError(null);
    try {
      await api.delete(`/admin/users/${u.id}`);
      setToDelete(null);
      await load();
    } catch (e) {
      setToDelete(null);
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || `No se pudo eliminar a ${u.email}.`);
    } finally {
      setBusy(null);
    }
  };

  const q = query.trim().toLowerCase();
  const visible = users.filter(u => {
    if (filter === 'disabled' && u.isActive) return false;
    if (filter === 'expired' && (!u.isActive || u.subscriptionActive)) return false;
    if (filter === 'active' && !u.subscriptionActive) return false;
    if (!q) return true;
    return [u.email, u.firstName, u.lastName, ...u.companies.flatMap(c => [c.name, c.taxId])]
      .some(v => v?.toLowerCase().includes(q));
  });
  const disabledCount = users.filter(u => !u.isActive).length;
  const expiredCount = users.filter(u => u.isActive && !u.subscriptionActive).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-800">Usuarios y suscripciones</h2>
          {disabledCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
              {disabledCount} deshabilitada{disabledCount > 1 ? 's' : ''}
            </span>
          )}
          {expiredCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-50 text-red-600 border border-red-200 tabular-nums">
              {expiredCount} vencida{expiredCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button type="button" onClick={load} className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" aria-hidden="true" /> Actualizar
        </button>
      </div>

      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
        <label htmlFor="admin-user-search" className="sr-only">Buscar usuario</label>
        <input
          id="admin-user-search"
          type="search"
          name="search"
          autoComplete="off"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por email, nombre, empresa o RUT…"
          className="flex-1 min-w-[12rem] px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div role="group" aria-label="Filtrar por estado" className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
          {([['all', 'Todos'], ['disabled', 'Deshabilitadas'], ['expired', 'Vencidas'], ['active', 'Vigentes']] as [Filter, string][]).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1.5 font-medium ${filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mx-5 mt-3 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</p>
      )}

      {loading ? (
        <div className="p-8 flex justify-center" role="status">
          <RefreshCw className="w-5 h-5 text-slate-400 motion-safe:animate-spin" aria-hidden="true" />
          <span className="sr-only">Cargando usuarios…</span>
        </div>
      ) : visible.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">No hay usuarios que coincidan.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map(u => {
            const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
            const ends = u.subscriptionEndsAt ? new Date(u.subscriptionEndsAt) : null;
            const hasMany = u.companies.length > 1;
            const isOpen = hasMany && expanded.has(u.id);
            const disabledCompanies = u.companies.filter(c => !c.isEnabled).length;
            return (
              <li key={u.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${!u.isActive ? 'bg-slate-300' : u.subscriptionActive ? 'bg-emerald-400' : 'bg-red-400'}`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-[14rem]">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {name || u.email}
                    {u.role === 'ADMIN' && <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">ADMIN</span>}
                    {!u.isActive && <span className="ml-2 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">DESHABILITADA</span>}
                    {u.isExempt && <span className="ml-2 text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5">EXENTO</span>}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {name ? `${u.email} · ` : ''}
                    {u.companies.length === 0
                      ? 'Sin empresa'
                      : u.companies.length === 1
                        ? `${u.companies[0].name}${u.companies[0].isEnabled ? '' : ' (deshabilitada)'}`
                        : null}
                  </p>
                  {hasMany && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(u.id)}
                      aria-expanded={isOpen}
                      aria-controls={`companies-${u.id}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                    >
                      <Building2 className="w-3 h-3" aria-hidden="true" />
                      {u.companies.length} empresas
                      {disabledCompanies > 0 && <span className="text-slate-500 font-normal">· {disabledCompanies} deshabilitada{disabledCompanies > 1 ? 's' : ''}</span>}
                      <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                  )}
                  <p className={`text-xs mt-0.5 ${u.subscriptionActive || !u.isActive ? 'text-slate-500' : 'text-red-600 font-medium'}`}>
                    {!u.isActive
                      ? 'Sin acceso hasta que la habilites'
                      : u.privileged
                        ? 'Sin vencimiento'
                        : ends
                          ? `${u.subscriptionActive ? 'Vigente hasta' : 'Venció el'} ${formatDateCL(ends)}`
                          : 'Sin fecha de vigencia'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {u.role !== 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => toggleActive(u)}
                      disabled={busy === u.id}
                      aria-pressed={u.isActive}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border disabled:opacity-50 ${u.isActive
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                      <Power className="w-3 h-3" aria-hidden="true" />
                      {u.isActive ? 'Deshabilitar' : 'Habilitar'}
                    </button>
                  )}
                  {/* Cupo de empresas: el admin suma una por cada suscripción comprada */}
                  {!u.privileged && (
                    <div
                      role="group"
                      aria-label={`Cupo de empresas de ${u.email}`}
                      title={`Puede registrar hasta ${u.maxCompanies} empresa${u.maxCompanies > 1 ? 's' : ''} (tiene ${u.companies.length})`}
                      className="flex items-center rounded-lg border border-slate-200 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => setMaxCompanies(u, u.maxCompanies - 1)}
                        disabled={busy === u.id || u.maxCompanies <= 1}
                        aria-label="Quitar un cupo de empresa"
                        className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-l-lg disabled:opacity-40"
                      >
                        <Minus className="w-3 h-3" aria-hidden="true" />
                      </button>
                      <span className={`px-1.5 flex items-center gap-1 font-semibold tabular-nums ${u.companies.length > u.maxCompanies ? 'text-red-600' : 'text-slate-700'}`}>
                        <Building2 className="w-3 h-3 text-slate-400" aria-hidden="true" />
                        {u.companies.length}/{u.maxCompanies}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMaxCompanies(u, u.maxCompanies + 1)}
                        disabled={busy === u.id}
                        aria-label="Agregar un cupo de empresa"
                        className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-r-lg disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  {!u.privileged && (
                    <>
                      <button
                        type="button"
                        onClick={() => renew(u, cy)}
                        disabled={busy === u.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        <CalendarCheck className="w-3 h-3" aria-hidden="true" />
                        Renovar hasta 31-12-{cy}
                      </button>
                      {/* En diciembre se puede adelantar la renovación del año siguiente */}
                      {isDecember && (
                        <button
                          type="button"
                          onClick={() => renew(u, cy + 1)}
                          disabled={busy === u.id}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Renovar {cy + 1}
                        </button>
                      )}
                    </>
                  )}
                  {u.role !== 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => toggleExempt(u)}
                      disabled={busy === u.id}
                      aria-pressed={u.isExempt}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                      {u.isExempt ? 'Quitar exención' : 'Marcar exento'}
                    </button>
                  )}
                  {u.role !== 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => setToDelete(u)}
                      disabled={busy === u.id}
                      aria-label={`Eliminar cuenta de ${u.email}`}
                      title="Eliminar cuenta"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {isOpen && (
                  <ul id={`companies-${u.id}`} className="basis-full ml-5 space-y-2">
                    {u.companies.map(c => (
                      <CompanyItem key={c.id} company={c} busy={busy === c.id} onToggle={() => toggleCompany(c)} />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {toDelete && (
        <DeleteAccountDialog
          user={toDelete}
          deleting={busy === toDelete.id}
          onCancel={() => setToDelete(null)}
          onConfirm={() => deleteAccount(toDelete)}
        />
      )}
    </div>
  );
};

/** Detalle de una empresa en el desplegable del usuario, con su habilitación. */
const CompanyItem: React.FC<{ company: AdminUserCompany; busy: boolean; onToggle: () => void }> = ({ company: c, busy, onToggle }) => (
  <li className={`rounded-lg border px-4 py-3 flex flex-wrap items-start gap-3 ${c.isEnabled ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-slate-100/70'}`}>
    <div className="flex-1 min-w-[14rem]">
      <p className={`text-sm font-medium truncate ${c.isEnabled ? 'text-slate-800' : 'text-slate-500'}`}>
        {c.name}
        {!c.isEnabled && <span className="ml-2 text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5">DESHABILITADA</span>}
      </p>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-slate-400">RUT</dt>
        <dd className="text-slate-600 font-mono">{c.taxId || '—'}</dd>
        {c.industry && (<>
          <dt className="text-slate-400">Sector</dt>
          <dd className="text-slate-600 truncate">{c.industry}</dd>
        </>)}
        <dt className="text-slate-400">País / moneda</dt>
        <dd className="text-slate-600">{c.country} · {c.currency}</dd>
        <dt className="text-slate-400">Creada</dt>
        <dd className="text-slate-600">{formatDateCL(new Date(c.createdAt))}</dd>
        <dt className="text-slate-400">Ejercicios</dt>
        <dd className="text-slate-600 tabular-nums">{c.annualYears.length > 0 ? c.annualYears.join(', ') : 'Sin datos anuales'}</dd>
        {c.consolidatedYears.length > 0 && (<>
          <dt className="text-slate-400">Solo lectura</dt>
          <dd className="text-slate-600 tabular-nums">{c.consolidatedYears.join(', ')}</dd>
        </>)}
        <dt className="text-slate-400">Informes</dt>
        <dd className="text-slate-600 tabular-nums">{c.reportCount}</dd>
      </dl>
    </div>
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={c.isEnabled}
      aria-label={`${c.isEnabled ? 'Deshabilitar' : 'Habilitar'} empresa ${c.name}`}
      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border disabled:opacity-50 ${c.isEnabled
        ? 'border-red-200 bg-white text-red-600 hover:bg-red-50'
        : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'}`}
    >
      {busy
        ? <RefreshCw className="w-3 h-3 motion-safe:animate-spin" aria-hidden="true" />
        : <Power className="w-3 h-3" aria-hidden="true" />}
      {c.isEnabled ? 'Deshabilitar' : 'Habilitar'}
    </button>
  </li>
);

/** Confirmación de borrado: hay que escribir el email de la cuenta. */
const DeleteAccountDialog: React.FC<{
  user: AdminUser;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ user, deleting, onCancel, onConfirm }) => {
  const [typed, setTyped] = useState('');
  const matches = typed.trim().toLowerCase() === user.email.toLowerCase();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !deleting) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleting, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/60" onClick={() => !deleting && onCancel()} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-desc"
        className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex w-10 h-10 rounded-full bg-red-50 items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 id="delete-account-title" className="text-base font-bold text-slate-900">Eliminar cuenta</h3>
            <div id="delete-account-desc" className="mt-1 text-sm text-slate-600 space-y-2">
              <p>
                Se eliminará <span className="font-semibold text-slate-900 break-all">{user.email}</span> junto con
                {user.companies.length > 0
                  ? <> sus empresas (<span className="font-medium">{user.companies.map(c => c.name).join(', ')}</span>), </>
                  : ' '}
                ejercicios, proyecciones e informes.
              </p>
              <p className="font-medium text-red-700">Esta acción no se puede deshacer.</p>
            </div>
          </div>
        </div>

        <form
          className="mt-5"
          onSubmit={e => { e.preventDefault(); if (matches && !deleting) onConfirm(); }}
        >
          <label htmlFor="delete-confirm-email" className="block text-xs font-medium text-slate-600 mb-1">
            Escribe el email de la cuenta para confirmar
          </label>
          <input
            id="delete-confirm-email"
            type="email"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={user.email}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!matches || deleting}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting
                ? <RefreshCw className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
                : <Trash2 className="w-4 h-4" aria-hidden="true" />}
              {deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
