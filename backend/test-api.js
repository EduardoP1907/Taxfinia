const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (company) {
    console.log('Company ID:', company.id);
    
    // Now get analysis
    const companyWithData = await prisma.company.findUnique({
      where: { id: company.id },
      include: {
        fiscalYears: {
          include: {
            balanceSheet: true,
            incomeStatement: true,
          },
          take: 1,
        },
      },
    });
    
    if (companyWithData && companyWithData.fiscalYears.length > 0) {
      const fy = companyWithData.fiscalYears[0];
      if (fy.balanceSheet) {
        console.log('\nBalance Sheet tangibleAssets:');
        console.log('Value:', fy.balanceSheet.tangibleAssets);
        console.log('Type:', typeof fy.balanceSheet.tangibleAssets);
        console.log('Constructor:', fy.balanceSheet.tangibleAssets?.constructor?.name);
        console.log('toString():', fy.balanceSheet.tangibleAssets?.toString());
        console.log('Number():', Number(fy.balanceSheet.tangibleAssets));
      }
      if (fy.incomeStatement) {
        console.log('\nIncome Statement revenue:');
        console.log('Value:', fy.incomeStatement.revenue);
        console.log('Type:', typeof fy.incomeStatement.revenue);
        console.log('Constructor:', fy.incomeStatement.revenue?.constructor?.name);
        console.log('toString():', fy.incomeStatement.revenue?.toString());
        console.log('Number():', Number(fy.incomeStatement.revenue));
      }
    }
  }
  await prisma.$disconnect();
}

main().catch(console.error);
