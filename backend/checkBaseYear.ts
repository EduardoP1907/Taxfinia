import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBaseYear() {
  try {
    console.log('🔍 Checking Base Year 2020 Data\n');

    const scenario = await prisma.projectionScenario.findFirst({
      where: {
        company: { name: 'prueba final' },
        baseYear: 2020,
      },
      include: {
        projections: {
          where: { year: 2020 },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!scenario || !scenario.projections[0]) {
      console.log('❌ No scenario found');
      return;
    }

    const proj = scenario.projections[0];
    console.log(`📊 Scenario: ${scenario.name}`);
    console.log(`   Base Year: ${proj.year}\n`);

    console.log('=== BALANCE SHEET DATA ===\n');
    console.log(`Total Assets: ${Number(proj.totalAssets).toLocaleString()}`);
    console.log(`Equity: ${Number(proj.equity).toLocaleString()}`);
    console.log(`Total Liabilities: ${Number(proj.totalLiabilities).toLocaleString()}`);

    console.log('\n=== INCOME STATEMENT DATA ===\n');
    console.log(`Revenue: ${Number(proj.revenue).toLocaleString()}`);
    console.log(`Financial Income: ${Number(proj.financialIncome).toLocaleString()}`);
    console.log(`Financial Expenses: ${Number(proj.financialExpenses).toLocaleString()}`);

    console.log('\n=== CALCULATED FIELDS ===\n');
    console.log(`Financial Cost Rate: ${proj.financialCostRate ? (Number(proj.financialCostRate) * 100).toFixed(4) + '%' : 'null'}`);

    console.log('\n=== MANUAL CALCULATION ===\n');
    const financialExpenses = Number(proj.financialExpenses);
    const totalLiabilities = Number(proj.totalLiabilities);
    const totalAssets = Number(proj.totalAssets);
    const equity = Number(proj.equity);

    // Current formula
    if (totalLiabilities > 0) {
      const rate1 = -financialExpenses / totalLiabilities;
      console.log(`Current Formula: -Financial Expenses / Total Liabilities`);
      console.log(`  = -${financialExpenses.toLocaleString()} / ${totalLiabilities.toLocaleString()}`);
      console.log(`  = ${(rate1 * 100).toFixed(4)}%`);
    }

    // Try with Equity instead of Total Liabilities
    if (equity > 0) {
      const rate2 = -financialExpenses / equity;
      console.log(`\nAlternative 1: -Financial Expenses / Equity`);
      console.log(`  = -${financialExpenses.toLocaleString()} / ${equity.toLocaleString()}`);
      console.log(`  = ${(rate2 * 100).toFixed(4)}%`);
    }

    // Try with Total Assets
    if (totalAssets > 0) {
      const rate3 = -financialExpenses / totalAssets;
      console.log(`\nAlternative 2: -Financial Expenses / Total Assets`);
      console.log(`  = -${financialExpenses.toLocaleString()} / ${totalAssets.toLocaleString()}`);
      console.log(`  = ${(rate3 * 100).toFixed(4)}%`);
    }

    // Try percentage of revenue
    const revenue = Number(proj.revenue);
    if (revenue > 0) {
      const rate4 = -financialExpenses / revenue;
      console.log(`\nAlternative 3: -Financial Expenses / Revenue`);
      console.log(`  = -${financialExpenses.toLocaleString()} / ${revenue.toLocaleString()}`);
      console.log(`  = ${(rate4 * 100).toFixed(4)}%`);
    }

    console.log(`\n🎯 EXPECTED FROM EXCEL: -27.74%`);

    // What would the denominator need to be to get -27.74%?
    const targetRate = -0.2774;
    const requiredDenominator = -financialExpenses / targetRate;
    console.log(`\n📐 To get -27.74%, denominator would need to be:`);
    console.log(`  = -${financialExpenses.toLocaleString()} / ${targetRate}`);
    console.log(`  = ${requiredDenominator.toLocaleString()}`);

    console.log(`\n💡 Ratio checks:`);
    console.log(`  Required / Total Liabilities = ${(requiredDenominator / totalLiabilities).toFixed(4)}`);
    console.log(`  Required / Equity = ${(requiredDenominator / equity).toFixed(4)}`);
    console.log(`  Required / Total Assets = ${(requiredDenominator / totalAssets).toFixed(4)}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBaseYear();
