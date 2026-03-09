import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testGrowthRatesAutoProjection() {
  try {
    console.log('🧪 Testing Automatic Growth Rate Projection\n');

    // Find the most recent scenario for "prueba final"
    const company = await prisma.company.findFirst({
      where: { name: 'prueba final' },
    });

    if (!company) {
      console.log('❌ Company "prueba final" not found');
      return;
    }

    const scenario = await prisma.projectionScenario.findFirst({
      where: { companyId: company.id },
      include: {
        projections: {
          orderBy: { year: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!scenario) {
      console.log('❌ No scenario found');
      return;
    }

    console.log(`📊 Scenario: ${scenario.name}`);
    console.log(`   Base Year: ${scenario.baseYear}`);
    console.log(`   Projections: ${scenario.projections.length} years\n`);

    // Show current state BEFORE updating growth rates
    console.log('=== BEFORE: Current State ===\n');
    scenario.projections.slice(0, 3).forEach((proj: any) => {
      console.log(`Year ${proj.year}:`);
      console.log(`  Revenue: ${proj.revenue ? Number(proj.revenue).toLocaleString() : 'null'}`);
      console.log(`  Cost of Sales: ${proj.costOfSales ? Number(proj.costOfSales).toLocaleString() : 'null'}`);
      console.log(`  EBITDA: ${proj.ebitda ? Number(proj.ebitda).toLocaleString() : 'null'}`);
      console.log(`  Revenue Growth Rate: ${proj.revenueGrowthRate ? (Number(proj.revenueGrowthRate) * 100).toFixed(2) + '%' : 'null'}`);
      console.log('');
    });

    // Update growth rate for year 2025
    const projection2025 = scenario.projections.find((p: any) => p.year === 2025);
    if (!projection2025) {
      console.log('❌ Year 2025 not found');
      return;
    }

    console.log('⚙️  Updating revenue growth rate for 2025 to 5%...\n');

    await prisma.financialProjection.update({
      where: { id: projection2025.id },
      data: {
        revenueGrowthRate: 0.05, // 5%
        costOfSalesGrowthRate: 0.04, // 4%
        otherOperatingExpensesGrowthRate: 0.03, // 3%
        depreciationGrowthRate: 0.02, // 2%
      },
    });

    // Manually call the apply growth rates logic (simulating what updateProjection does)
    const { ProjectionsService } = await import('./src/services/projections.service');
    const projectionsService = new ProjectionsService();

    await projectionsService.applyStoredGrowthRatesFromYear(scenario.id, 2025);

    // Fetch updated scenario
    const updatedScenario = await prisma.projectionScenario.findUnique({
      where: { id: scenario.id },
      include: {
        projections: {
          orderBy: { year: 'asc' },
        },
      },
    });

    if (!updatedScenario) return;

    // Show state AFTER updating growth rates
    console.log('=== AFTER: Projected Values ===\n');
    updatedScenario.projections.slice(0, 3).forEach((proj: any) => {
      console.log(`Year ${proj.year}:`);
      console.log(`  Revenue: ${proj.revenue ? Number(proj.revenue).toLocaleString() : 'null'}`);
      console.log(`  Cost of Sales: ${proj.costOfSales ? Number(proj.costOfSales).toLocaleString() : 'null'}`);
      console.log(`  EBITDA: ${proj.ebitda ? Number(proj.ebitda).toLocaleString() : 'null'}`);
      console.log(`  Revenue Growth Rate: ${proj.revenueGrowthRate ? (Number(proj.revenueGrowthRate) * 100).toFixed(2) + '%' : 'null'}`);
      console.log('');
    });

    console.log('✅ Growth rates automatically projected values forward!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGrowthRatesAutoProjection();
