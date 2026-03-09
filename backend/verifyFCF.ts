import { PrismaClient } from '@prisma/client';
import * as projFormulas from './src/utils/projections';

const prisma = new PrismaClient();

async function verifyFCF() {
  try {
    console.log('🔍 Verificando cálculo de Free Cash Flow...\n');

    // Find the company and get the projection scenario
    const companies = await prisma.company.findMany({
      include: {
        projections: {
          include: {
            projections: {
              orderBy: { year: 'asc' },
            },
          },
        },
      },
    });

    if (companies.length === 0) {
      console.log('❌ No companies found');
      return;
    }

    const company = companies[0];
    const scenario = company.projections[0];

    if (!scenario) {
      console.log('❌ No projection scenarios found');
      return;
    }

    console.log('📊 Company:', company.name);
    console.log('Scenario:', scenario.name);
    console.log('');

    // Get base year and next year projections
    const baseProjection = scenario.projections[0]; // 2024 (base year)
    const nextProjection = scenario.projections.find(p => p.year === 2025); // 2025

    if (!baseProjection) {
      console.log('❌ No base year projection found');
      return;
    }

    console.log('Base Year:', baseProjection.year);
    console.log('');

    // Get values from base year (2024)
    const ebit = Number(baseProjection.ebit);
    const ebt = Number(baseProjection.ebt);
    const incomeTax = Number(baseProjection.incomeTax);
    const totalAssets2024 = Number(baseProjection.totalAssets);
    const currentFCF = baseProjection.freeCashFlow;

    console.log('=== Valores 2024 (Año Base) ===');
    console.log('EBIT:', ebit.toLocaleString());
    console.log('EBT:', ebt.toLocaleString());
    console.log('Income Tax:', incomeTax.toLocaleString());
    console.log('Total Activo 2024:', totalAssets2024.toLocaleString());
    console.log('');

    // Calculate tax rate
    const taxRate = ebt > 0 ? incomeTax / ebt : 0.25;
    console.log('Tax Rate:', (taxRate * 100).toFixed(2) + '%');
    console.log('');

    // Calculate NOPAT
    const nopat = projFormulas.calculateNOPAT(ebit, taxRate);
    console.log('NOPAT = EBIT × (1 - Tax Rate)');
    console.log('NOPAT =', ebit.toLocaleString(), '× (1 -', (taxRate * 100).toFixed(2) + '%)');
    console.log('NOPAT =', nopat.toLocaleString());
    console.log('');

    // Get Total Activo 2023 (from fiscal years)
    const fiscalYear2023 = await prisma.fiscalYear.findFirst({
      where: {
        companyId: company.id,
        year: 2023,
      },
      include: {
        balanceSheet: true,
      },
    });

    if (!fiscalYear2023 || !fiscalYear2023.balanceSheet) {
      console.log('⚠ No se encontró Balance 2023, FCF no se puede calcular');
      return;
    }

    const balance2023 = fiscalYear2023.balanceSheet;
    const totalAssets2023 =
      Number(balance2023.tangibleAssets) +
      Number(balance2023.intangibleAssets) +
      Number(balance2023.financialInvestmentsLp) +
      Number(balance2023.otherNoncurrentAssets) +
      Number(balance2023.inventory) +
      Number(balance2023.accountsReceivable) +
      Number(balance2023.otherReceivables) +
      Number(balance2023.taxReceivables) +
      Number(balance2023.cashEquivalents);

    console.log('=== Inversión Neta ===');
    console.log('Total Activo 2024:', totalAssets2024.toLocaleString());
    console.log('Total Activo 2023:', totalAssets2023.toLocaleString());
    const netInvestment = totalAssets2024 - totalAssets2023;
    console.log('Inversión Neta (2024 - 2023):', netInvestment.toLocaleString());
    console.log('');

    // Calculate FCF with new formula
    const newFCF = projFormulas.calculateFreeCashFlow(
      nopat,
      totalAssets2024,
      totalAssets2023
    );

    console.log('=== Cálculo FCF ===');
    console.log('FCF actual en BD:', currentFCF ? Number(currentFCF).toLocaleString() : 'null');
    console.log('');
    console.log('FCF con nueva fórmula Excel (NOPAT - Inversión Neta):');
    console.log('  Cálculo:', `${nopat.toLocaleString()} - (${netInvestment.toLocaleString()})`);
    console.log('  Resultado:', newFCF.toLocaleString());
    console.log('');

    console.log('=== Verificación contra Excel ===');
    const expectedFCF = 4853214425; // G36 del Excel
    console.log('FCF esperado (Excel G36):', expectedFCF.toLocaleString());
    console.log('FCF calculado:', newFCF.toLocaleString());

    const difference = Math.abs(newFCF - expectedFCF);
    if (difference < 1) {
      console.log('✅ FCF CORRECTO - Coincide con Excel!');
    } else {
      console.log('❌ FCF NO coincide con Excel');
      console.log('   Diferencia:', difference.toLocaleString());
    }

    // Also show the calculation breakdown
    console.log('');
    console.log('=== Desglose Excel (Hoja 4.1) ===');
    console.log('G20 (NOPAT):', nopat.toLocaleString());
    console.log('G35 (Inversión Neta):', netInvestment.toLocaleString());
    console.log('G36 (FCF = G20 - G35):', (nopat - netInvestment).toLocaleString());

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFCF();
