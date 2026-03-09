import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugCalculations() {
  try {
    console.log('🔍 Debugging Projection Calculations\n');

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
            year: {
              in: [2020, 2021]
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

    console.log(`📊 Scenario: ${scenario.name}\n`);

    const proj2020 = scenario.projections.find(p => p.year === 2020);
    const proj2021 = scenario.projections.find(p => p.year === 2021);

    if (!proj2020 || !proj2021) {
      console.log('❌ Years 2020 or 2021 not found');
      return;
    }

    console.log('=== AÑO 2021 - VALORES ALMACENADOS EN DB ===\n');

    console.log('📊 INPUT VALUES:');
    console.log(`  Revenue: ${Number(proj2021.revenue).toLocaleString()}`);
    console.log(`  Cost of Sales: ${Number(proj2021.costOfSales).toLocaleString()}`);
    console.log(`  Other Op Expenses: ${Number(proj2021.otherOperatingExpenses).toLocaleString()}`);
    console.log(`  Depreciation: ${Number(proj2021.depreciation).toLocaleString()}`);
    console.log(`  Exceptional Net: ${Number(proj2021.exceptionalNet).toLocaleString()}`);
    console.log(`  Financial Income: ${Number(proj2021.financialIncome).toLocaleString()}`);
    console.log(`  Financial Expenses: ${Number(proj2021.financialExpenses).toLocaleString()}`);
    console.log(`  Income Tax: ${Number(proj2021.incomeTax).toLocaleString()}`);
    console.log(`  Total Assets: ${Number(proj2021.totalAssets).toLocaleString()}`);
    console.log(`  Equity: ${Number(proj2021.equity).toLocaleString()}`);
    console.log(`  Total Liabilities: ${Number(proj2021.totalLiabilities).toLocaleString()}`);
    console.log('');

    console.log('💰 CALCULATED VALUES (STORED):');
    console.log(`  EBITDA: ${proj2021.ebitda ? Number(proj2021.ebitda).toLocaleString() : 'null'}`);
    console.log(`  EBIT: ${proj2021.ebit ? Number(proj2021.ebit).toLocaleString() : 'null'}`);
    console.log(`  Financial Net: ${proj2021.financialNet ? Number(proj2021.financialNet).toLocaleString() : 'null'}`);
    console.log(`  EBT: ${proj2021.ebt ? Number(proj2021.ebt).toLocaleString() : 'null'}`);
    console.log(`  Net Income: ${proj2021.netIncome ? Number(proj2021.netIncome).toLocaleString() : 'null'}`);
    console.log(`  NOPAT: ${proj2021.nopat ? Number(proj2021.nopat).toLocaleString() : 'null'}`);
    console.log(`  Tax Rate: ${proj2021.incomeTaxRate ? (Number(proj2021.incomeTaxRate) * 100).toFixed(2) + '%' : 'null'}`);
    console.log('');

    console.log('📈 RATIOS (STORED):');
    console.log(`  ROA: ${proj2021.roa ? Number(proj2021.roa).toFixed(4) + '%' : 'null'}`);
    console.log(`  ROE: ${proj2021.roe ? Number(proj2021.roe).toFixed(4) + '%' : 'null'}`);
    console.log(`  Financial Leverage: ${proj2021.financialLeverage ? Number(proj2021.financialLeverage).toFixed(4) : 'null'}`);
    console.log(`  Operational Risk: ${proj2021.operationalRisk ? Number(proj2021.operationalRisk).toFixed(4) : 'null'}`);
    console.log(`  Financial Risk: ${proj2021.financialRisk ? Number(proj2021.financialRisk).toFixed(4) : 'null'}`);
    console.log('');

    console.log('💵 CASH FLOW:');
    console.log(`  Free Cash Flow: ${proj2021.freeCashFlow ? Number(proj2021.freeCashFlow).toLocaleString() : 'null'}`);
    console.log('');

    // MANUAL CALCULATIONS TO VERIFY
    console.log('=== CÁLCULOS MANUALES (VERIFICACIÓN) ===\n');

    const revenue = Number(proj2021.revenue);
    const costOfSales = Number(proj2021.costOfSales);
    const otherOpExpenses = Number(proj2021.otherOperatingExpenses);
    const depreciation = Number(proj2021.depreciation);
    const exceptionalNet = Number(proj2021.exceptionalNet);
    const financialIncome = Number(proj2021.financialIncome);
    const financialExpenses = Number(proj2021.financialExpenses);
    const incomeTax = Number(proj2021.incomeTax);
    const totalAssets = Number(proj2021.totalAssets);
    const equity = Number(proj2021.equity);

    // Step by step calculations
    const margenBruto = revenue - costOfSales;
    const manualEBITDA = margenBruto - otherOpExpenses;
    const manualEBIT = manualEBITDA - depreciation + exceptionalNet;
    const manualFinancialNet = financialIncome - financialExpenses;
    const manualEBT = manualEBIT + manualFinancialNet;
    const manualTaxRate = manualEBT > 0 ? incomeTax / manualEBT : 0.25;
    const manualNetIncome = manualEBT - incomeTax;
    const manualNOPAT = manualEBIT * (1 - manualTaxRate);

    console.log('📊 INCOME STATEMENT:');
    console.log(`  Revenue: ${revenue.toLocaleString()}`);
    console.log(`  - Cost of Sales: ${costOfSales.toLocaleString()}`);
    console.log(`  = Margen Bruto: ${margenBruto.toLocaleString()}`);
    console.log(`  - Other Op Expenses: ${otherOpExpenses.toLocaleString()}`);
    console.log(`  = EBITDA: ${manualEBITDA.toLocaleString()}`);
    console.log(`  - Depreciation: ${depreciation.toLocaleString()}`);
    console.log(`  + Exceptional Net: ${exceptionalNet.toLocaleString()}`);
    console.log(`  = EBIT: ${manualEBIT.toLocaleString()}`);
    console.log(`  + Financial Net (${financialIncome.toLocaleString()} - ${financialExpenses.toLocaleString()}): ${manualFinancialNet.toLocaleString()}`);
    console.log(`  = EBT: ${manualEBT.toLocaleString()}`);
    console.log(`  - Income Tax: ${incomeTax.toLocaleString()}`);
    console.log(`  = Net Income: ${manualNetIncome.toLocaleString()}`);
    console.log('');
    console.log(`  Tax Rate: ${(manualTaxRate * 100).toFixed(2)}%`);
    console.log(`  NOPAT (EBIT × (1 - taxRate)): ${manualNOPAT.toLocaleString()}`);
    console.log('');

    // Ratios
    const operatingResultBeforeExceptional = manualEBITDA - depreciation;
    const manualROA = (operatingResultBeforeExceptional / totalAssets) * 100;
    const manualROE = (manualNetIncome / equity) * 100;
    const manualFinLeverage = totalAssets / equity;
    const manualOpRisk = manualEBIT / manualEBT;
    const manualFinRisk = manualEBT / manualEBIT;

    console.log('📈 RATIOS CALCULADOS:');
    console.log(`  Operating Result (EBITDA - Dep): ${operatingResultBeforeExceptional.toLocaleString()}`);
    console.log(`  ROA (OpResult / TotalAssets × 100): ${manualROA.toFixed(4)}%`);
    console.log(`  ROE (NetIncome / Equity × 100): ${manualROE.toFixed(4)}%`);
    console.log(`  Financial Leverage (TotalAssets / Equity): ${manualFinLeverage.toFixed(4)}`);
    console.log(`  Operational Risk (EBIT / EBT): ${manualOpRisk.toFixed(4)}`);
    console.log(`  Financial Risk (EBT / EBIT): ${manualFinRisk.toFixed(4)}`);
    console.log('');

    // Free Cash Flow
    const totalAssets2024 = Number(proj2020.totalAssets);
    const deltaAssets = totalAssets - totalAssets2024;
    const manualFCF = manualNOPAT - deltaAssets;

    console.log('💵 FREE CASH FLOW:');
    console.log(`  NOPAT: ${manualNOPAT.toLocaleString()}`);
    console.log(`  - ΔTotal Assets (${totalAssets.toLocaleString()} - ${totalAssets2024.toLocaleString()}): ${deltaAssets.toLocaleString()}`);
    console.log(`  = FCF: ${manualFCF.toLocaleString()}`);
    console.log('');

    // Comparisons
    console.log('=== COMPARACIÓN STORED vs CALCULADO ===\n');

    const compareValue = (name: string, stored: any, calculated: number) => {
      const storedNum = stored ? Number(stored) : 0;
      const diff = Math.abs(storedNum - calculated);
      const match = diff < 1 ? '✅' : '❌';
      console.log(`${name}:`);
      console.log(`  Stored: ${storedNum.toLocaleString()}`);
      console.log(`  Calculated: ${calculated.toLocaleString()}`);
      console.log(`  Match: ${match} (diff: ${diff.toFixed(2)})`);
      console.log('');
    };

    compareValue('EBITDA', proj2021.ebitda, manualEBITDA);
    compareValue('EBIT', proj2021.ebit, manualEBIT);
    compareValue('EBT', proj2021.ebt, manualEBT);
    compareValue('Net Income', proj2021.netIncome, manualNetIncome);
    compareValue('NOPAT', proj2021.nopat, manualNOPAT);
    compareValue('FCF', proj2021.freeCashFlow, manualFCF);

    console.log('🎯 VALORES ESPERADOS DEL EXCEL:');
    console.log('  Operational Risk: 7.58');
    console.log('  ROE: 23.46%');
    console.log('  Financial Leverage: 1.01');
    console.log('  Financial Risk: 1.24');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCalculations();
