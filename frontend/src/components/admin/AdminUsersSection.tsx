import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Users, CalendarCheck, ShieldCheck, Power } from 'lucide-react';
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
  privileged: boolean;
  subscriptionEndsAt: string | null;
  subscriptionActive: boolean;
  createdAt: string;
  companies: { id: string; name: string; taxId: string | null }[];
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
                    {u.companies.length > 0 ? u.companies.map(c => c.name).join(', ') : 'Sin empresa'}
                  </p>
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
