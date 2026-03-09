import { PrismaClient } from '@prisma/client';
import * as projFormulas from './src/utils/projections';

const prisma = new PrismaClient();

async function verifyROA() {
  try {
    console.log('🔍 Verificando cálculo de ROA...\n');

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

    const baseProjection = scenario.projections[0]; // First year (base year)

    console.log('📊 Company:', company.name);
    console.log('Scenario:', scenario.name);
    console.log('Base Year:', baseProjection.year);
    console.log('');

    // Get values
    const ebitda = Number(baseProjection.ebitda);
    const depreciation = Number(baseProjection.depreciation);
    const ebit = Number(baseProjection.ebit);
    const totalAssets = Number(baseProjection.totalAssets);
    const currentROA = baseProjection.roa;

    console.log('=== Valores ===');
    console.log('EBITDA:', ebitda.toLocaleString());
    console.log('Depreciation:', depreciation.toLocaleString());
    console.log('Operating Result (EBITDA - Depr):', (ebitda - depreciation).toLocaleString());
    console.log('EBIT (with exceptionals):', ebit.toLocaleString());
    console.log('Total Assets:', totalAssets.toLocaleString());
    console.log('');

    // Calculate ROA with new formula
    const newROA = projFormulas.calculateROA(ebitda, depreciation, totalAssets);

    // Calculate ROA with old formula (using EBIT)
    const oldROA = totalAssets > 0 ? (ebit / totalAssets) * 100 : null;

    console.log('=== Cálculo ROA ===');
    console.log('ROA actual en BD:', currentROA);
    console.log('');
    console.log('ROA con nueva fórmula (EBITDA - Depr / Assets):');
    console.log('  Cálculo:', `(${(ebitda - depreciation).toLocaleString()} / ${totalAssets.toLocaleString()}) * 100`);
    console.log('  Resultado:', newROA?.toFixed(2) + '%');
    console.log('');
    console.log('ROA con fórmula antigua (EBIT / Assets):');
    console.log('  Cálculo:', `(${ebit.toLocaleString()} / ${totalAssets.toLocaleString()}) * 100`);
    console.log('  Resultado:', oldROA?.toFixed(2) + '%');
    console.log('');

    console.log('=== Verificación contra Excel ===');
    const expectedROA = 31.21;
    console.log('ROA esperado (Excel):', expectedROA + '%');
    console.log('ROA calculado:', newROA?.toFixed(2) + '%');

    if (newROA && Math.abs(newROA - expectedROA) < 0.01) {
      console.log('✅ ROA CORRECTO - Coincide con Excel!');
    } else {
      console.log('❌ ROA NO coincide con Excel');
      console.log('   Diferencia:', newROA ? (newROA - expectedROA).toFixed(2) : 'N/A');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyROA();
