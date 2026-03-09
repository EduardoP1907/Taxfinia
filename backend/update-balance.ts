import prisma from './src/config/database';

async function updateBalance() {
  // Find fiscal year 2024
  const fiscalYear = await prisma.fiscalYear.findFirst({
    where: { year: 2024 },
    include: { balanceSheet: true }
  });

  if (!fiscalYear) {
    console.log('Fiscal year 2024 not found');
    return;
  }

  console.log('Updating balance sheet for fiscal year 2024...');

  // Update balance sheet with complete data from DATOS-2024.md
  const updated = await prisma.balanceSheet.update({
    where: { fiscalYearId: fiscalYear.id },
    data: {
      // ACTIVO NO CORRIENTE
      tangibleAssets: 9414869,
      intangibleAssets: 2656500,
      financialInvestmentsLp: 28092,
      otherNoncurrentAssets: 31313,

      // ACTIVO CORRIENTE
      inventory: 459500,
      accountsReceivable: 4539872,
      otherReceivables: 4956136,
      taxReceivables: 0,
      cashEquivalents: 14049314,

      // PATRIMONIO NETO
      shareCapital: 8078520,
      reserves: 25073395,
      retainedEarnings: 0, // Se calculará como diferencia
      treasuryStock: 0,

      // PASIVO NO CORRIENTE
      provisionsLp: 0,
      bankDebtLp: 0,
      otherLiabilitiesLp: 0,

      // PASIVO CORRIENTE
      provisionsSp: 1426518,
      bankDebtSp: 1177166,
      accountsPayable: 2562848,
      taxLiabilities: 22076,
      otherLiabilitiesSp: 76814,
    }
  });

  console.log('Balance sheet updated successfully!');
  console.log('\nUpdated values:');
  console.log('- Share Capital:', updated.shareCapital.toString());
  console.log('- Reserves:', updated.reserves.toString());
  console.log('- Bank Debt SP:', updated.bankDebtSp.toString());
  console.log('- Accounts Payable:', updated.accountsPayable.toString());
  console.log('- Provisions SP:', updated.provisionsSp.toString());
  console.log('- Tax Liabilities:', updated.taxLiabilities.toString());

  await prisma.$disconnect();
}

updateBalance().catch(console.error);
