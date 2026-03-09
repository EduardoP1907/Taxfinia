import prisma from './src/config/database';

async function checkData() {
  const fiscalYears = await prisma.fiscalYear.findMany({
    where: { year: 2024 },
    include: { balanceSheet: true, incomeStatement: true, company: true }
  });

  if (fiscalYears.length > 0) {
    const fy = fiscalYears[0];
    const bs = fy.balanceSheet;
    const is = fy.incomeStatement;

    console.log('\n==============================================');
    console.log('Company:', fy.company.name);
    console.log('Year:', fy.year);
    console.log('==============================================\n');

    console.log('BALANCE SHEET VALUES:');
    console.log('- Inventory:', bs?.inventory?.toString());
    console.log('- Accounts Receivable:', bs?.accountsReceivable?.toString());
    console.log('- Other Receivables:', bs?.otherReceivables?.toString());
    console.log('- Cash Equivalents:', bs?.cashEquivalents?.toString());
    console.log('- Bank Debt SP:', bs?.bankDebtSp?.toString());
    console.log('- Accounts Payable:', bs?.accountsPayable?.toString());
    console.log('- Equity (Share Capital):', bs?.shareCapital?.toString());
    console.log('- Equity (Reserves):', bs?.reserves?.toString());
    console.log('- Equity (Retained Earnings):', bs?.retainedEarnings?.toString());

    console.log('\nINCOME STATEMENT VALUES:');
    console.log('- Revenue:', is?.revenue?.toString());
    console.log('- Cost of Sales:', is?.costOfSales?.toString());
    console.log('- Admin Expenses:', is?.adminExpenses?.toString());

    console.log('\nCALCULATED VALUES:');
    const currentAssets = Number(bs?.inventory || 0) + Number(bs?.accountsReceivable || 0) + Number(bs?.otherReceivables || 0) + Number(bs?.cashEquivalents || 0);
    const currentLiabilities = Number(bs?.bankDebtSp || 0) + Number(bs?.accountsPayable || 0);
    console.log('- Current Assets:', currentAssets);
    console.log('- Current Liabilities:', currentLiabilities);
    console.log('- Current Ratio:', currentLiabilities > 0 ? currentAssets / currentLiabilities : 'N/A');

  } else {
    console.log('No fiscal year 2024 found');
  }

  await prisma.$disconnect();
}

checkData().catch(console.error);
