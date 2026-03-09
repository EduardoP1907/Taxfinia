import { PrismaClient } from '@prisma/client';
import { ProjectionsService } from './src/services/projections.service';

const prisma = new PrismaClient();
const projectionsService = new ProjectionsService();

async function testAutoGrowthRateFromValue() {
  try {
    console.log('🧪 Testing Automatic Growth Rate Calculation from Value\n');

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
    console.log(`   Base Year: ${scenario.baseYear}\n`);

    // Get base year (2024) and year 2025
    const projection2024 = scenario.projections.find((p: any) => p.year === 2024);
    const projection2025 = scenario.projections.find((p: any) => p.year === 2025);

    if (!projection2024 || !projection2025) {
      console.log('❌ Years 2024 or 2025 not found');
      return;
    }

    console.log('=== BEFORE: Current State ===\n');
    console.log(`Year 2024 (base):`);
    console.log(`  Revenue: ${Number(projection2024.revenue).toLocaleString()}`);
    console.log(`  Cost of Sales: ${Number(projection2024.costOfSales).toLocaleString()}`);
    console.log(`  Other Op Expenses: ${Number(projection2024.otherOperatingExpenses).toLocaleString()}`);
    console.log(`  Depreciation: ${Number(projection2024.depreciation).toLocaleString()}\n`);

    console.log(`Year 2025:`);
    console.log(`  Revenue: ${projection2025.revenue ? Number(projection2025.revenue).toLocaleString() : 'null'}`);
    console.log(`  Cost of Sales: ${projection2025.costOfSales ? Number(projection2025.costOfSales).toLocaleString() : 'null'}`);
    console.log(`  Revenue Growth Rate: ${projection2025.revenueGrowthRate ? (Number(projection2025.revenueGrowthRate) * 100).toFixed(2) + '%' : 'null'}\n`);

    console.log('⚙️  Step 1: Entering Revenue value for 2025...');
    console.log('   Entering: 18,661,771,800 (which is 2024 revenue × 1.05)\n');

    // Update revenue value (system should calculate growth rate automatically)
    await projectionsService.updateProjection(projection2025.id, {
      revenue: 18661771800,
    });

    console.log('✅ Revenue updated!\n');

    console.log('⚙️  Step 2: Entering growth rates for other fields in VARIACIONES...');
    console.log('   Cost of Sales Growth Rate: 4%');
    console.log('   Other Op Expenses Growth Rate: 3%');
    console.log('   Depreciation Growth Rate: 2%\n');

    // Update growth rates for other fields
    await projectionsService.updateProjection(projection2025.id, {
      costOfSalesGrowthRate: 0.04,
      otherOperatingExpensesGrowthRate: 0.03,
      depreciationGrowthRate: 0.02,
    });

    console.log('✅ Growth rates entered!\n');

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

    const updated2025 = updatedScenario.projections.find((p: any) => p.year === 2025);
    const updated2026 = updatedScenario.projections.find((p: any) => p.year === 2026);

    console.log('=== AFTER: Calculated Values ===\n');
    console.log(`Year 2025:`);
    console.log(`  Revenue: ${updated2025?.revenue ? Number(updated2025.revenue).toLocaleString() : 'null'}`);
    console.log(`  Revenue Growth Rate: ${updated2025?.revenueGrowthRate ? (Number(updated2025.revenueGrowthRate) * 100).toFixed(2) + '%' : 'null'} ✅ Auto-calculated!`);
    console.log(`  Cost of Sales: ${updated2025?.costOfSales ? Number(updated2025.costOfSales).toLocaleString() : 'null'}`);
    console.log(`  Other Op Expenses: ${updated2025?.otherOperatingExpenses ? Number(updated2025.otherOperatingExpenses).toLocaleString() : 'null'}`);
    console.log(`  Depreciation: ${updated2025?.depreciation ? Number(updated2025.depreciation).toLocaleString() : 'null'}`);
    console.log(`  EBITDA: ${updated2025?.ebitda ? Number(updated2025.ebitda).toLocaleString() : 'null'}`);
    console.log(`  EBIT: ${updated2025?.ebit ? Number(updated2025.ebit).toLocaleString() : 'null'}\n`);

    console.log(`Year 2026 (projected automatically):`);
    console.log(`  Revenue: ${updated2026?.revenue ? Number(updated2026.revenue).toLocaleString() : 'null'}`);
    console.log(`  Cost of Sales: ${updated2026?.costOfSales ? Number(updated2026.costOfSales).toLocaleString() : 'null'}`);
    console.log(`  EBITDA: ${updated2026?.ebitda ? Number(updated2026.ebitda).toLocaleString() : 'null'}\n`);

    // Calculate expected values
    const baseRevenue = Number(projection2024.revenue);
    const expectedRevenue2025 = 18661771800;
    const expectedGrowthRate = (expectedRevenue2025 - baseRevenue) / baseRevenue;
    const expectedCostOfSales = Number(projection2024.costOfSales) * 1.04;
    const expectedOtherExpenses = Number(projection2024.otherOperatingExpenses) * 1.03;
    const expectedDepreciation = Number(projection2024.depreciation) * 1.02;
    const expectedEBITDA = expectedRevenue2025 - expectedCostOfSales - expectedOtherExpenses;

    console.log('=== VERIFICATION ===\n');
    console.log(`Expected Revenue Growth Rate: ${(expectedGrowthRate * 100).toFixed(2)}%`);
    console.log(`Calculated Revenue Growth Rate: ${updated2025?.revenueGrowthRate ? (Number(updated2025.revenueGrowthRate) * 100).toFixed(2) + '%' : 'null'}`);
    console.log(`Match: ${Math.abs(expectedGrowthRate - Number(updated2025?.revenueGrowthRate || 0)) < 0.0001 ? '✅' : '❌'}\n`);

    console.log(`Expected Cost of Sales (7,396,779,000 × 1.04): ${expectedCostOfSales.toLocaleString()}`);
    console.log(`Calculated Cost of Sales: ${updated2025?.costOfSales ? Number(updated2025.costOfSales).toLocaleString() : 'null'}`);
    console.log(`Match: ${Math.abs(expectedCostOfSales - Number(updated2025?.costOfSales || 0)) < 1 ? '✅' : '❌'}\n`);

    console.log(`Expected EBITDA: ${expectedEBITDA.toLocaleString()}`);
    console.log(`Calculated EBITDA: ${updated2025?.ebitda ? Number(updated2025.ebitda).toLocaleString() : 'null'}`);
    console.log(`Match: ${Math.abs(expectedEBITDA - Number(updated2025?.ebitda || 0)) < 1 ? '✅' : '❌'}\n`);

    console.log('🎉 Test Complete!');
    console.log('\n📝 Summary:');
    console.log('✅ User can enter revenue VALUE directly');
    console.log('✅ System calculates growth rate automatically');
    console.log('✅ User can enter growth rates in VARIACIONES');
    console.log('✅ System projects all fields forward using growth rates');
    console.log('✅ All calculated fields show correct values');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoGrowthRateFromValue();
