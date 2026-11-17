/**
 * Actualiza el país de las empresas existentes al catálogo de 26 países
 * (PROMETHEIA_26_paises_monedas.xlsx):
 *   ES / FR / DE → EU (Zona euro)   UK → GB (Gran Bretaña)
 * y ajusta la moneda de cada empresa a la de su país.
 *
 * Uso:  npx ts-node scripts/migrate-countries.ts          (simulación)
 *       npx ts-node scripts/migrate-countries.ts --apply  (aplica cambios)
 */
import { PrismaClient } from '@prisma/client';
import { COUNTRY_CODES, LEGACY_COUNTRY_CODES, resolveCurrency } from '../src/constants/countries';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, country: true, currency: true },
  });

  let changed = 0;
  for (const c of companies) {
    const code = (c.country ?? '').toUpperCase();
    const target = LEGACY_COUNTRY_CODES[code] ?? code;

    if (!COUNTRY_CODES.includes(target)) {
      console.warn(`⚠ ${c.name}: país "${c.country}" no está en el catálogo — revisar manualmente`);
      continue;
    }
    const currency = resolveCurrency(target, c.currency);
    if (target !== c.country || currency !== c.currency) {
      console.log(`${apply ? '✔' : '→'} ${c.name}: ${c.country}/${c.currency} → ${target}/${currency}`);
      if (apply) await prisma.company.update({ where: { id: c.id }, data: { country: target, currency } });
      changed++;
    }
  }

  console.log(`\n${companies.length} empresas revisadas, ${changed} ${apply ? 'actualizadas' : 'por actualizar (ejecuta con --apply)'}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
