import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugYear2025() {
  try {
    console.log('🔍 Debugging Year 2025 Calculation Issue\n');

    // Find the most recent scenario
    const scenario = await prisma.projectionScenario.findFirst({
      where: {
        company: {
          name: 'prueba final'
        }
      },
      include: {
        projections: {
          where: {
            year: {
              in: [2024, 2025]
            }
          },
          orderBy: { year: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!scenario) {
      console.log('❌ No scenario found');
      return;
    }

    console.log(`Scenario: ${scenario.name}\n`);

    const proj2024 = scenario.projections.find(p => p.year === 2024);
    const proj2025 = scenario.projections.find(p => p.year === 2025);

    if (!proj2024 || !proj2025) {
      console.log('❌ Years not found');
      return;
    }

    console.log('=== YEAR 2024 (BASE) ===');
    console.log(`Revenue: ${Number(proj2024.revenue).toLocaleString()}`);
    console.log(`Cost of Sales: ${Number(proj2024.costOfSales).toLocaleString()}`);
    console.log(`Other Op Expenses: ${Number(proj2024.otherOperatingExpenses).toLocaleString()}`);
    console.log(`Depreciation: ${Number(proj2024.depreciation).toLocaleString()}`);
    console.log(`EBITDA: ${proj2024.ebitda ? Number(proj2024.ebitda).toLocaleString() : 'null'}`);
    console.log(`EBIT: ${proj2024.ebit ? Number(proj2024.ebit).toLocaleString() : 'null'}`);
    console.log(`Total Assets: ${Number(proj2024.totalAssets).toLocaleString()}`);
    console.log(`Equity: ${Number(proj2024.equity).toLocaleString()}`);
    console.log('');

    console.log('=== YEAR 2025 ===');
    console.log(`Revenue: ${Number(proj2025.revenue).toLocaleString()}`);
    console.log(`Cost of Sales: ${Number(proj2025.costOfSales).toLocaleString()}`);
    console.log(`Other Op Expenses: ${Number(proj2025.otherOperatingExpenses).toLocaleString()}`);
    console.log(`Depreciation: ${Number(proj2025.depreciation).toLocaleString()}`);
    console.log(`EBITDA: ${proj2025.ebitda ? Number(proj2025.ebitda).toLocaleString() : 'null'}`);
    console.log(`EBIT: ${proj2025.ebit ? Number(proj2025.ebit).toLocaleString() : 'null'}`);
    console.log(`NOPAT: ${proj2025.nopat ? Number(proj2025.nopat).toLocaleString() : 'null'}`);
    console.log(`EBT: ${proj2025.ebt ? Number(proj2025.ebt).toLocaleString() : 'null'}`);
    console.log(`Net Income: ${proj2025.netIncome ? Number(proj2025.netIncome).toLocaleString() : 'null'}`);
    console.log('');

    console.log('=== RATIOS 2025 ===');
    console.log(`ROA: ${proj2025.roa ? (Number(proj2025.roa) * 100).toFixed(2) + '%' : 'null'}`);
    console.log(`ROE: ${proj2025.roe ? (Number(proj2025.roe) * 100).toFixed(2) + '%' : 'null'}`);
    console.log(`Financial Leverage: ${proj2025.financialLeverage ? Number(proj2025.financialLeverage).toFixed(2) : 'null'}`);
    console.log(`Operational Risk: ${proj2025.operationalRisk ? Number(proj2025.operationalRisk).toFixed(4) : 'null'}`);
    console.log(`Financial Risk: ${proj2025.financialRisk ? Number(proj2025.financialRisk).toFixed(4) : 'null'}`);
    console.log('');

    console.log('=== GROWTH RATES 2025 ===');
    console.log(`Revenue Growth Rate: ${proj2025.revenueGrowthRate ? (Number(proj2025.revenueGrowthRate) * 100).toFixed(2) + '%' : 'null'}`);
    console.log(`Cost of Sales Growth Rate: ${proj2025.costOfSalesGrowthRate ? (Number(proj2025.costOfSalesGrowthRate) * 100).toFixed(2) + '%' : 'null'}`);
    console.log(`Other Op Expenses Growth Rate: ${proj2025.otherOperatingExpensesGrowthRate ? (Number(proj2025.otherOperatingExpensesGrowthRate) * 100).toFixed(2) + '%' : 'null'}`);
    console.log('');

    // Manual calculation check
    console.log('=== MANUAL CALCULATION CHECK ===');
    const manualEBITDA = Number(proj2025.revenue) - Number(proj2025.costOfSales) - Number(proj2025.otherOperatingExpenses);
    console.log(`Manual EBITDA: ${manualEBITDA.toLocaleString()}`);
    console.log(`Stored EBITDA: ${proj2025.ebitda ? Number(proj2025.ebitda).toLocaleString() : 'null'}`);
    console.log(`Match: ${Math.abs(manualEBITDA - Number(proj2025.ebitda || 0)) < 1 ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugYear2025();
