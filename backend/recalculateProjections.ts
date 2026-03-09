import { PrismaClient } from '@prisma/client';
import { ProjectionsService } from './src/services/projections.service';

const prisma = new PrismaClient();
const projectionsService = new ProjectionsService();

async function recalculateAllProjections() {
  try {
    console.log('🔄 Recalculating all projection scenarios...\n');

    // Find all scenarios
    const scenarios = await prisma.projectionScenario.findMany({
      include: {
        company: true,
        projections: {
          orderBy: { year: 'asc' },
        },
      },
    });

    console.log(`Found ${scenarios.length} scenarios\n`);

    for (const scenario of scenarios) {
      console.log(`📊 Scenario: ${scenario.name}`);
      console.log(`   Company: ${scenario.company.name}`);
      console.log(`   Base Year: ${scenario.baseYear}`);
      console.log(`   Projections: ${scenario.projections.length} years`);

      // Check if base year has data
      const baseYearProjection = scenario.projections.find(p => p.year === scenario.baseYear);
      if (!baseYearProjection) {
        console.log('   ❌ Base year projection not found, skipping...\n');
        continue;
      }

      const baseRevenue = Number(baseYearProjection.revenue);
      console.log(`   Base year revenue: ${baseRevenue.toLocaleString()}`);

      if (baseRevenue === 0) {
        console.log('   ⚠️  Base year has no data, skipping recalculation...\n');
        continue;
      }

      // Recalculate all metrics
      console.log('   🔄 Recalculating metrics...');
      await projectionsService.recalculateScenarioMetrics(scenario.id);

      console.log('   ✅ Recalculation complete\n');
    }

    console.log('✅ All scenarios recalculated successfully');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateAllProjections();
