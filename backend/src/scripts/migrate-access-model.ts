/**
 * Migra los datos existentes al nuevo modelo de acceso (ejecutar UNA vez tras
 * `npx prisma db push`; es idempotente, se puede repetir sin efectos extra):
 *
 *  1. Exentos: marca isExempt en las cuentas con acceso permanente (antes
 *     LOCK_EXEMPT_EMAILS en el código) y les desbloquea todo.
 *  2. Empresas bloqueadas (isLocked) de usuarios normales → sus ejercicios
 *     anuales con datos quedan consolidados (solo lectura); se limpia isLocked.
 *  3. Usuarios normales sin vigencia → vencen el 31-dic del año en curso.
 *
 * Uso (desde backend/):
 *   node dist/scripts/migrate-access-model.js
 * En desarrollo: npx ts-node --transpile-only src/scripts/migrate-access-model.ts
 */

import prisma from '../config/database';
import { currentYear, endOfSubscriptionYear, isPrivileged } from '../services/access.service';

const EXEMPT_EMAILS = ['fmonroyfe@gmail.com'];

async function main() {
  // 1. Exentos
  for (const email of EXEMPT_EMAILS) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (!user) {
      console.log(`[1] ${email}: usuario no encontrado`);
      continue;
    }
    await prisma.user.update({ where: { id: user.id }, data: { isExempt: true } });
    await prisma.company.updateMany({ where: { userId: user.id }, data: { isLocked: false } });
    await prisma.fiscalYear.updateMany({ where: { company: { userId: user.id } }, data: { consolidatedAt: null } });
    console.log(`[1] ${email}: marcado como exento`);
  }

  // 2. Empresas bloqueadas → ejercicios consolidados
  const locked = await prisma.company.findMany({
    where: { isLocked: true },
    select: { id: true, name: true, user: { select: { role: true, isExempt: true } } },
  });
  for (const c of locked) {
    if (!isPrivileged(c.user)) {
      const { count } = await prisma.fiscalYear.updateMany({
        where: {
          companyId: c.id, quarter: 0, month: 0, consolidatedAt: null,
          OR: [{ balanceSheet: { isNot: null } }, { incomeStatement: { isNot: null } }],
        },
        data: { consolidatedAt: new Date() },
      });
      console.log(`[2] ${c.name}: ${count} ejercicio(s) consolidado(s)`);
    }
    await prisma.company.update({ where: { id: c.id }, data: { isLocked: false } });
  }

  // 3. Vigencia por defecto
  const endsAt = endOfSubscriptionYear(currentYear());
  const { count } = await prisma.user.updateMany({
    where: { subscriptionEndsAt: null, isExempt: false, role: { not: 'ADMIN' } },
    data: { subscriptionEndsAt: endsAt },
  });
  console.log(`[3] ${count} usuario(s) con vigencia hasta ${endsAt.toISOString()}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
