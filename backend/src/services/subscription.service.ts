/**
 * Gestión de suscripciones: renovación (admin) y aviso automático de vencimiento.
 */
import prisma from '../config/database';
import { sendSubscriptionExpiryWarningEmail, sendAccountActivatedEmail } from '../utils/email';
import { currentYear, endOfSubscriptionYear, formatDateCL, invalidateAccessUser } from './access.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const WARNING_DAYS = 30;

/**
 * Admin: renueva la suscripción hasta el 31-dic del año en curso.
 * Si se renueva en diciembre para el año siguiente, `year` permite indicarlo.
 */
export async function renewSubscription(userId: string, year = currentYear()) {
  const user = await prisma.user.update({
    where: { id: userId },
    // Renovar no habilita la cuenta: eso se hace aparte con setUserActive
    data: { subscriptionEndsAt: endOfSubscriptionYear(year), expiryWarningSentAt: null },
    select: { id: true, email: true, subscriptionEndsAt: true },
  });
  invalidateAccessUser(userId);
  return user;
}

export async function setUserExempt(userId: string, isExempt: boolean) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isExempt },
    select: { id: true, email: true, isExempt: true },
  });
  invalidateAccessUser(userId);
  return user;
}

/** Admin: fija cuántas empresas activas puede registrar el usuario (p. ej. una por suscripción comprada). */
export async function setUserMaxCompanies(userId: string, maxCompanies: number) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { maxCompanies },
    select: { id: true, email: true, maxCompanies: true },
  });
  invalidateAccessUser(userId);
  return user;
}

/**
 * Admin: habilita o deshabilita una cuenta. Al deshabilitarla se cierran sus
 * sesiones; al habilitarla se avisa al usuario por email.
 */
export async function setUserActive(userId: string, isActive: boolean) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
  if (!target) throw new AccountError('Usuario no encontrado', 404);
  if (target.role === 'ADMIN') throw new AccountError('No se puede deshabilitar una cuenta de administrador', 400);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, email: true, firstName: true, isActive: true },
  });
  if (!isActive) await prisma.session.deleteMany({ where: { userId } });
  invalidateAccessUser(userId);

  if (isActive && !target.isActive) {
    sendAccountActivatedEmail({ email: user.email, firstName: user.firstName })
      .catch(err => console.error(`[ACCOUNT] No se pudo avisar la habilitación a ${user.email}:`, err));
  }
  return user;
}

/**
 * Admin: elimina una cuenta de forma definitiva. Sus empresas, ejercicios,
 * informes y sesiones se borran en cascada (onDelete: Cascade en el schema).
 */
export async function deleteUserAccount(userId: string, requestedBy: string) {
  if (userId === requestedBy) throw new AccountError('No puedes eliminar tu propia cuenta', 400);
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (!target) throw new AccountError('Usuario no encontrado', 404);
  if (target.role === 'ADMIN') throw new AccountError('No se puede eliminar una cuenta de administrador', 400);

  await prisma.user.delete({ where: { id: userId } });
  invalidateAccessUser(userId);
  console.log(`[ACCOUNT] Cuenta ${target.email} eliminada por el admin ${requestedBy}`);
  return { id: userId, email: target.email };
}

export class AccountError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Envía el aviso a cuentas que vencen en los próximos 30 días (una vez por período). */
export async function sendExpiryWarnings(now = new Date()): Promise<number> {
  const users = await prisma.user.findMany({
    where: {
      role: { not: 'ADMIN' },
      isExempt: false,
      isActive: true,
      expiryWarningSentAt: null,
      subscriptionEndsAt: { gt: now, lte: new Date(now.getTime() + WARNING_DAYS * DAY_MS) },
    },
    select: { id: true, email: true, firstName: true, subscriptionEndsAt: true },
  });

  let sent = 0;
  for (const u of users) {
    try {
      await sendSubscriptionExpiryWarningEmail({
        email: u.email,
        firstName: u.firstName,
        endsAt: formatDateCL(u.subscriptionEndsAt!),
      });
      await prisma.user.update({ where: { id: u.id }, data: { expiryWarningSentAt: now } });
      sent++;
    } catch (err) {
      console.error(`[SUBSCRIPTION] No se pudo enviar el aviso a ${u.email}:`, err);
    }
  }
  if (sent > 0) console.log(`[SUBSCRIPTION] Avisos de vencimiento enviados: ${sent}`);
  return sent;
}

/** Revisa los avisos al iniciar y luego cada 12 horas. */
export function startSubscriptionJobs(): void {
  const run = () => sendExpiryWarnings().catch(err => console.error('[SUBSCRIPTION] Error en avisos:', err));
  setTimeout(run, 60_000);
  setInterval(run, 12 * 60 * 60 * 1000).unref();
}
