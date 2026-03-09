import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugCosteFinanciero() {
  try {
    console.log('🔍 Debugging Coste Financiero\n');

    // Find the most recent scenario for "prueba final" with base year 2020
    const scenario = await prisma.projectionScenario.findFirst({
      where: {
        company: {
          name: 'prueba final'
        },
        baseYear: 2020,
      },
      include: {
        projections: {
          where: {
            year: 2020
          },
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
    console.log(`   Year: ${proj.year}\n`);

    console.log('=== VALORES ALMACENADOS ===\n');
    console.log(`Financial Expenses (DB): ${Number(proj.financialExpenses).toLocaleString()}`);
    console.log(`Total Liabilities (DB): ${Number(proj.totalLiabilities).toLocaleString()}`);
    console.log(`Financial Cost Rate (DB): ${proj.financialCostRate ? (Number(proj.financialCostRate) * 100).toFixed(2) + '%' : 'null'}\n`);

    console.log('=== CÁLCULO MANUAL ===\n');
    const financialExpenses = Number(proj.financialExpenses);
    const totalLiabilities = Number(proj.totalLiabilities);

    console.log(`Financial Expenses: ${financialExpenses.toLocaleString()}`);
    console.log(`Total Liabilities: ${totalLiabilities.toLocaleString()}`);

    if (totalLiabilities > 0) {
      const manualCostRate = -financialExpenses / totalLiabilities;
      console.log(`\nFórmula: -Financial Expenses / Total Liabilities`);
      console.log(`Cálculo: -(${financialExpenses.toLocaleString()}) / ${totalLiabilities.toLocaleString()}`);
      console.log(`Resultado: ${(manualCostRate * 100).toFixed(2)}%\n`);
    }

    console.log('🎯 VALOR ESPERADO DEL EXCEL: -27.74%\n');

    // También verificar el Income Statement original
    const company = await prisma.company.findFirst({
      where: { name: 'prueba final' },
      include: {
        fiscalYears: {
          where: { year: 2020 },
          include: {
            incomeStatement: true,
          }
        }
      }
    });

    if (company?.fiscalYears[0]?.incomeStatement) {
      const income = company.fiscalYears[0].incomeStatement;
      console.log('=== INCOME STATEMENT ORIGINAL ===\n');
      console.log(`Financial Expenses (Income): ${Number(income.financialExpenses).toLocaleString()}`);
      console.log(`Financial Income (Income): ${Number(income.financialIncome).toLocaleString()}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCosteFinanciero();
