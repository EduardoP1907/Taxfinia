/**
 * Gestión de suscripciones: renovación (admin) y aviso automático de vencimiento.
 */
import prisma from '../config/database';
import { sendSubscriptionExpiryWarningEmail } from '../utils/email';
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
    data: { subscriptionEndsAt: endOfSubscriptionYear(year), isActive: true, expiryWarningSentAt: null },
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
