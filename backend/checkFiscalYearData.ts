import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFiscalYearData() {
  try {
    console.log('📊 Checking fiscal year data...\n');

    // Check companies
    const companies = await prisma.company.findMany({
      include: {
        fiscalYears: {
          include: {
            incomeStatement: true,
            balanceSheet: true,
          },
          orderBy: { year: 'desc' },
        },
      },
    });

    console.log(`Found ${companies.length} companies:\n`);

    for (const company of companies) {
      console.log(`\n=== ${company.name} ===`);
      console.log(`Fiscal Years: ${company.fiscalYears.length}`);

      for (const fy of company.fiscalYears) {
        console.log(`\n  Year ${fy.year}:`);

        if (fy.incomeStatement) {
          const income = fy.incomeStatement;
          console.log('    Income Statement:');
          console.log(`      Revenue: ${income.revenue ? Number(income.revenue).toLocaleString() : 'null'}`);
          console.log(`      Cost of Sales: ${income.costOfSales ? Number(income.costOfSales).toLocaleString() : 'null'}`);
          console.log(`      Admin Expenses: ${income.adminExpenses ? Number(income.adminExpenses).toLocaleString() : 'null'}`);
          console.log(`      Depreciation: ${income.depreciation ? Number(income.depreciation).toLocaleString() : 'null'}`);
          console.log(`      Financial Expenses: ${income.financialExpenses ? Number(income.financialExpenses).toLocaleString() : 'null'}`);
          console.log(`      Income Tax: ${income.incomeTax ? Number(income.incomeTax).toLocaleString() : 'null'}`);
        } else {
          console.log('    Income Statement: NOT FOUND');
        }

        if (fy.balanceSheet) {
          const balance = fy.balanceSheet;
          const totalAssets =
            Number(balance.tangibleAssets || 0) +
            Number(balance.intangibleAssets || 0) +
            Number(balance.financialInvestmentsLp || 0) +
            Number(balance.otherNoncurrentAssets || 0) +
            Number(balance.inventory || 0) +
            Number(balance.accountsReceivable || 0) +
            Number(balance.otherReceivables || 0) +
            Number(balance.taxReceivables || 0) +
            Number(balance.cashEquivalents || 0);

          const equity =
            Number(balance.shareCapital || 0) +
            Number(balance.reserves || 0) +
            Number(balance.retainedEarnings || 0) -
            Number(balance.treasuryStock || 0);

          console.log('    Balance Sheet:');
          console.log(`      Total Assets (calculated): ${totalAssets.toLocaleString()}`);
          console.log(`      Equity (calculated): ${equity.toLocaleString()}`);
        } else {
          console.log('    Balance Sheet: NOT FOUND');
        }
      }
    }

    // Check projections
    console.log('\n\n=== PROJECTION SCENARIOS ===\n');
    const scenarios = await prisma.projectionScenario.findMany({
      include: {
        company: true,
        projections: {
          where: { year: { in: [2024, 2025] } }, // Solo años base y siguiente
          orderBy: { year: 'asc' },
        },
      },
    });

    for (const scenario of scenarios) {
      console.log(`\nScenario: ${scenario.name} (Company: ${scenario.company.name})`);
      console.log(`Base Year: ${scenario.baseYear}`);

      for (const proj of scenario.projections) {
        console.log(`\n  Year ${proj.year}:`);
        console.log(`    Revenue: ${proj.revenue ? Number(proj.revenue).toLocaleString() : 'null'}`);
        console.log(`    Cost of Sales: ${proj.costOfSales ? Number(proj.costOfSales).toLocaleString() : 'null'}`);
        console.log(`    Other Op Expenses: ${proj.otherOperatingExpenses ? Number(proj.otherOperatingExpenses).toLocaleString() : 'null'}`);
        console.log(`    Depreciation: ${proj.depreciation ? Number(proj.depreciation).toLocaleString() : 'null'}`);
        console.log(`    EBITDA: ${proj.ebitda ? Number(proj.ebitda).toLocaleString() : 'null'}`);
        console.log(`    EBIT: ${proj.ebit ? Number(proj.ebit).toLocaleString() : 'null'}`);
        console.log(`    Total Assets: ${proj.totalAssets ? Number(proj.totalAssets).toLocaleString() : 'null'}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFiscalYearData();
