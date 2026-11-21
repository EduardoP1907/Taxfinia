/**
 * Cierre inicial de ejercicios (ejecutar UNA vez tras `npx prisma db push` que agrega
 * FiscalYear.closedAt; es idempotente).
 *
 * Antes el año de trabajo se derivaba del calendario. Para que nada cambie al
 * desplegar, se marcan como cerrados los ejercicios ANUALES ya cargados (con Balance
 * y P&G) hasta el año actual − 1. Desde ahí, el usuario cierra cada nuevo ejercicio
 * desde "Datos Financieros" con confirmación.
 *
 * Uso (desde backend/):
 *   node dist/scripts/migrate-fiscal-close.js
 * En desarrollo: npx ts-node --transpile-only src/scripts/migrate-fiscal-close.ts
 */

import prisma from '../config/database';
import { currentYear } from '../services/access.service';

async function main() {
  const maxYear = currentYear() - 1;
  const { count } = await prisma.fiscalYear.updateMany({
    where: {
      quarter: 0,
      month: 0,
      closedAt: null,
      year: { lte: maxYear },
      balanceSheet: { isNot: null },
      incomeStatement: { isNot: null },
    },
    data: { closedAt: new Date() },
  });
  console.log(`${count} ejercicio(s) anual(es) hasta ${maxYear} marcados como cerrados`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
