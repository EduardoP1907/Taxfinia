/**
 * Reaplica las tasas por defecto a TODAS las empresas activas:
 *   - Hoja 4.0: todos los escenarios de proyección (recalcula 4.1/4.2/4.3).
 *     P&G con las tasas fijas por defecto; Balance y tasa impositiva con el
 *     promedio de los últimos 3 años de "Datos anuales" (igual que la Hoja 4.0).
 *   - Forecast y Budget: las 8 filas de tasas mensuales guardadas, con las
 *     tasas fijas por defecto (Impuestos = % sobre el Resultado antes de impuestos).
 * Sobrescribe las tasas existentes; antes guarda un respaldo JSON.
 *
 * Uso (desde backend/):
 *   node dist/scripts/apply-default-rates.js            → simulación, no escribe
 *   node dist/scripts/apply-default-rates.js --apply    → respalda y aplica
 * En desarrollo: npx ts-node --transpile-only src/scripts/apply-default-rates.ts [--apply]
 */

import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import { ProjectionsService } from '../services/projections.service';
import { getHistoricalRates, type MonthlySuggestedRates } from '../services/historical-rates.service';
import { DEFAULT_MONTHLY_RATES } from '../services/monthly-forecast.service';

const APPLY = process.argv.includes('--apply');
// Misma tasa por defecto que la Hoja 4.0 cuando no hay años con EBT positivo
const DEFAULT_TAX_RATE = 0.27;

// Tasas por defecto de la Cuenta de P&G de la Hoja 4.0 (mismas que GrowthRatesConfigPage)
const DEFAULT_PL_RATES = {
  revenueGrowthRate: 0.045,
  costOfSalesGrowthRate: 0.04,
  otherOperatingExpensesGrowthRate: 0.02,
  depreciationGrowthRate: 0.02,
  exceptionalNetGrowthRate: 0.02,
  financialIncomeGrowthRate: 0.02,
};

const MONTHLY_RATE_FIELDS: Record<string, keyof MonthlySuggestedRates> = {
  rateRevenue: 'revenue',
  rateCostOfSales: 'costOfSales',
  rateAdminExpenses: 'adminExpenses',
  rateExceptionalIncome: 'exceptionalIncome',
  rateExceptionalExpenses: 'exceptionalExpenses',
  rateFinancialIncome: 'financialIncome',
  rateFinancialExpenses: 'financialExpenses',
  rateIncomeTax: 'incomeTax',
};

const pct = (r: number | null) => (r === null ? 'sin datos' : `${(r * 100).toFixed(2)}%`);

async function main() {
  const projectionsService = new ProjectionsService();

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  const companyIds = companies.map((c) => c.id);

  const scenarios = await prisma.projectionScenario.findMany({
    where: { companyId: { in: companyIds } },
    include: { projections: { orderBy: { year: 'asc' } } },
  });
  const forecasts = await prisma.monthlyForecast.findMany({
    where: { companyId: { in: companyIds } },
  });

  console.log(`${APPLY ? 'APLICANDO' : 'SIMULACIÓN (usa --apply para escribir)'} — ` +
    `${companies.length} empresas, ${scenarios.length} escenarios, ${forecasts.length} forecast/budget guardados\n`);

  if (APPLY) {
    const backupDir = path.resolve(process.cwd(), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const file = path.join(backupDir, `rates-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, JSON.stringify({
      scenarios: scenarios.map((s) => ({ id: s.id, companyId: s.companyId, baseYear: s.baseYear, projections: s.projections })),
      monthlyForecasts: forecasts,
    }, null, 2));
    console.log(`Respaldo: ${file}\n`);
  }

  // Las 8 filas de Forecast/Budget llevan la misma tasa en los 12 meses
  const monthlyData: Record<string, number[]> = {};
  for (const [field, concept] of Object.entries(MONTHLY_RATE_FIELDS)) {
    monthlyData[field] = Array(12).fill(DEFAULT_MONTHLY_RATES[concept] ?? 0);
  }

  let scenariosDone = 0;
  let forecastsDone = 0;
  const failures: string[] = [];

  for (const company of companies) {
    const companyScenarios = scenarios.filter((s) => s.companyId === company.id);
    const companyForecasts = forecasts.filter((f) => f.companyId === company.id);
    if (companyScenarios.length === 0 && companyForecasts.length === 0) continue;
    console.log(`■ ${company.name} (${company.id})`);

    // ── Hoja 4.0: escenarios ──
    for (const scenario of companyScenarios) {
      try {
        const hist = await getHistoricalRates(company.id, scenario.baseYear);
        const a = hist.annual;
        const growthRatesByYear = scenario.projections
          .filter((p) => p.year > scenario.baseYear)
          .map((p) => ({
            year: p.year,
            ...DEFAULT_PL_RATES,
            financialExpensesGrowthRate: 0,
            totalAssetsGrowthRate: a.totalAssetsGrowthRate ?? 0,
            equityGrowthRate: a.equityGrowthRate ?? 0,
            totalLiabilitiesGrowthRate: a.totalLiabilitiesGrowthRate ?? 0,
            incomeTaxRate: a.taxRate ?? DEFAULT_TAX_RATE,
          }));
        console.log(`   4.0 escenario base ${scenario.baseYear} (${growthRatesByYear.length} años): P&G por defecto, ` +
          `activos ${pct(a.totalAssetsGrowthRate)}, impuesto ${pct(a.taxRate ?? DEFAULT_TAX_RATE)}`);
        if (APPLY && growthRatesByYear.length > 0) {
          await projectionsService.applyGrowthRatesToScenario(scenario.id, growthRatesByYear);
        }
        scenariosDone++;
      } catch (err: any) {
        failures.push(`${company.name} escenario ${scenario.id}: ${err.message}`);
      }
    }

    // ── Forecast / Budget mensual ──
    for (const record of companyForecasts) {
      try {
        console.log(`   Forecast/Budget ${record.year}: tasas por defecto`);
        if (APPLY) {
          await prisma.monthlyForecast.update({ where: { id: record.id }, data: monthlyData });
        }
        forecastsDone++;
      } catch (err: any) {
        failures.push(`${company.name} forecast ${record.year}: ${err.message}`);
      }
    }
  }

  console.log(`\n${APPLY ? 'Actualizados' : 'Se actualizarían'}: ${scenariosDone} escenarios, ${forecastsDone} forecast/budget.`);
  if (failures.length > 0) {
    console.log(`Errores (${failures.length}):`);
    failures.forEach((f) => console.log(`   - ${f}`));
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
