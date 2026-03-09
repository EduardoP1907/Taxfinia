import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProjections() {
  try {
    console.log('📊 Checking projections in database...\n');

    // Check companies
    const companies = await prisma.company.findMany();
    console.log(`Found ${companies.length} companies:`);
    companies.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));
    console.log('');

    // Check projection scenarios
    const scenarios = await prisma.projectionScenario.findMany({
      include: {
        company: true,
        projections: {
          orderBy: { year: 'asc' },
        },
      },
    });

    console.log(`Found ${scenarios.length} projection scenarios:`);
    scenarios.forEach(s => {
      console.log(`  - ${s.name} (Company: ${s.company.name})`);
      console.log(`    Base Year: ${s.baseYear}`);
      console.log(`    Projections: ${s.projections.length} years`);
      if (s.projections.length > 0) {
        console.log(`    Years: ${s.projections.map(p => p.year).join(', ')}`);

        // Show FCF for each year
        console.log('    FCF values:');
        s.projections.forEach(p => {
          const fcf = p.freeCashFlow ? Number(p.freeCashFlow).toLocaleString() : 'null';
          console.log(`      Year ${p.year}: ${fcf}`);
        });
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjections();
