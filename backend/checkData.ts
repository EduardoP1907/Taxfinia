import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    // Find the company
    const companies = await prisma.company.findMany({
      include: {
        fiscalYears: {
          where: { year: 2024 },
          include: {
            incomeStatement: true,
            balanceSheet: true,
          },
        },
      },
    });

    if (companies.length === 0) {
      console.log('No companies found');
      return;
    }

    const company = companies[0];
    console.log('Company:', company.name);
    console.log('Fiscal Year:', company.fiscalYears[0]?.year);

    const income = company.fiscalYears[0]?.incomeStatement;
    const balance = company.fiscalYears[0]?.balanceSheet;

    if (!income) {
      console.log('No income statement found');
      return;
    }

    console.log('\n=== INCOME STATEMENT ===');
    console.log('Revenue:', Number(income.revenue).toLocaleString());
    console.log('Cost of Sales:', Number(income.costOfSales).toLocaleString());
    console.log('Admin Expenses:', Number(income.adminExpenses).toLocaleString());
    console.log('Staff Costs Admin:', Number(income.staffCostsAdmin).toLocaleString());
    console.log('Depreciation:', Number(income.depreciation).toLocaleString());
    console.log('Exceptional Income:', Number(income.exceptionalIncome).toLocaleString());
    console.log('Exceptional Expenses:', Number(income.exceptionalExpenses).toLocaleString());
    console.log('Financial Income:', Number(income.financialIncome).toLocaleString());
    console.log('Financial Expenses:', Number(income.financialExpenses).toLocaleString());
    console.log('Income Tax:', Number(income.incomeTax).toLocaleString());

    console.log('\n=== CALCULATIONS ===');
    const revenue = Number(income.revenue);
    const costOfSales = Number(income.costOfSales);
    const adminExpenses = Number(income.adminExpenses);
    const staffCostsAdmin = Number(income.staffCostsAdmin);
    const depreciation = Number(income.depreciation);

    const margenBruto = revenue - costOfSales;
    console.log('Margen Bruto (Revenue - CostOfSales):', margenBruto.toLocaleString());

    const otherOperatingExpenses = adminExpenses + staffCostsAdmin;
    console.log('Other Operating Expenses (Admin + Staff):', otherOperatingExpenses.toLocaleString());

    const ebitda = margenBruto - otherOperatingExpenses;
    console.log('EBITDA (Margen Bruto - Other Expenses):', ebitda.toLocaleString());

    console.log('\n=== EXPECTED FROM EXCEL ===');
    console.log('Revenue:', '17,773,116,000');
    console.log('Margen Bruto:', '10,376,337,000');
    console.log('Gastos de explotación:', '5,556,118,000');
    console.log('EBITDA:', '4,820,219,000');
    console.log('Depreciación:', '435,485,000');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
