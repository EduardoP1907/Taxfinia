import { useAuthStore } from '../store/authStore';

/**
 * Estado de acceso del usuario actual (espejo de las reglas del backend, que es
 * quien realmente las aplica):
 *  - readOnly: suscripción vencida o cuenta desactivada → no se pueden guardar
 *    datos, generar informes ni usar el asistente IA.
 *  - privileged: ADMIN o exento → sin vencimiento ni bloqueo de ejercicios.
 *  - yearWindow: ejercicios anuales que se pueden cargar/editar.
 */
export function useAccess() {
  const user = useAuthStore(s => s.user);
  const privileged = !!user && (user.privileged ?? user.role === 'ADMIN');
  const readOnly = !!user && !privileged && user.subscriptionActive === false;
  const cy = new Date().getFullYear();
  const yearWindow = user?.annualYearWindow ?? { min: cy - 5, max: cy - 1 };
  const endsAt = user?.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : null;

  return { user, privileged, readOnly, yearWindow, endsAt };
}

export const formatDateCL = (d: Date) =>
  new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
