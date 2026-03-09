import { PrismaClient } from '@prisma/client';
import { ProjectionsService } from './src/services/projections.service';

const prisma = new PrismaClient();
const projectionsService = new ProjectionsService();

async function fixBaseYearData() {
  try {
    console.log('🔧 Fixing Base Year Data...\n');

    // Find the company
    const company = await prisma.company.findFirst({
      where: { name: 'prueba final' },
    });

    if (!company) {
      console.log('❌ Company not found');
      return;
    }

    // Delete all existing scenarios for this company
    console.log('🗑️  Deleting existing scenarios...');
    await prisma.projectionScenario.deleteMany({
      where: { companyId: company.id }
    });
    console.log('✅ Existing scenarios deleted\n');

    // Create a new scenario with correct base year data
    console.log('📊 Creating new scenario with correct data...');
    const newScenario = await projectionsService.createProjectionScenario(
      company.id,
      2024,
      10,
      'Proyección 4.1 - Corregida'
    );

    console.log('✅ New scenario created\n');
    console.log(`Scenario ID: ${newScenario.id}`);
    console.log(`Base Year: ${newScenario.baseYear}`);
    console.log(`Projections: ${newScenario.projections.length} years\n`);

    // Verify the base year data
    const baseYearProj = newScenario.projections.find(p => p.year === 2024);
    if (baseYearProj) {
      console.log('=== BASE YEAR DATA VERIFICATION ===\n');
      console.log(`Financial Expenses: ${Number(baseYearProj.financialExpenses).toLocaleString()}`);
      console.log(`Financial Income: ${Number(baseYearProj.financialIncome).toLocaleString()}`);
      console.log(`Total Liabilities: ${Number(baseYearProj.totalLiabilities).toLocaleString()}`);

      if (baseYearProj.financialCostRate) {
        console.log(`Financial Cost Rate: ${(Number(baseYearProj.financialCostRate) * 100).toFixed(2)}%`);
      }

      console.log(`\n🎯 Expected Financial Cost Rate: -27.74%\n`);
    }

    console.log('✅ Done! You can now use the new scenario in the frontend.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBaseYearData();
