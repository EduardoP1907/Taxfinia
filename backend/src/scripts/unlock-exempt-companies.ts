/**
 * Desbloquea las empresas (isLocked = false) de las cuentas con acceso
 * permanente a los datos anuales (LOCK_EXEMPT_EMAILS). Desde este cambio
 * esas empresas ya no se bloquean; esto corrige las que ya estaban bloqueadas.
 *
 * Uso (desde backend/):
 *   node dist/scripts/unlock-exempt-companies.js
 * En desarrollo: npx ts-node --transpile-only src/scripts/unlock-exempt-companies.ts
 */

import prisma from '../config/database';
import { LOCK_EXEMPT_EMAILS } from '../services/company.service';

async function main() {
  for (const email of LOCK_EXEMPT_EMAILS) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (!user) {
      console.log(`${email}: usuario no encontrado`);
      continue;
    }
    const { count } = await prisma.company.updateMany({
      where: { userId: user.id, isLocked: true },
      data: { isLocked: false },
    });
    console.log(`${email}: ${count} empresa(s) desbloqueada(s)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
