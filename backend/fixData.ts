import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

async function fixData() {
  try {
    console.log('🔍 Reading Excel file...');
    const workbook = XLSX.readFile(path.join(__dirname, '..', 'TAXFINMHO2024.xlsx'));
    const datosSheet = workbook.Sheets['DATOS'];

    if (!datosSheet) {
      throw new Error('DATOS sheet not found');
    }

    // Extract values from DATOS sheet (Column G = Year 2024)
    // IMPORTANT: G54 is used as DEPRECIATION in this Excel, not staff costs!
    const excelData = {
      // Row 47: Revenue (Ingresos por Ventas)
      revenue: datosSheet['G47']?.v || 0,

      // Row 49: Cost of Sales (material/product) - stored as negative in Excel
      costOfSales: Math.abs(datosSheet['G49']?.v || 0),

      // Row 50: Staff Costs Sales
      staffCostsSales: Math.abs(datosSheet['G50']?.v || 0),

      // Row 52: Admin Expenses (Gastos de administración) - stored as negative
      // This is the TOTAL operating expenses (excluding depreciation)
      adminExpenses: Math.abs(datosSheet['G52']?.v || 0),

      // Row 54: DEPRECIATION (not staff costs!) - stored as negative in Excel
      // In Sheet 2.1, H22 references DATOS!G54 as depreciation
      depreciation: Math.abs(datosSheet['G54']?.v || 0),

      // Staff costs admin - not used in this Excel structure
      staffCostsAdmin: 0,

      // Row 57 & 58: Both are -1,094,400,000 (same value)
      // This means exceptional income is 0 and exceptional expenses is 1,094,400,000
      // Net = 0 - 1,094,400,000 = -1,094,400,000
      exceptionalIncome: 0,

      // Exceptional Expenses - stored as negative in Excel
      exceptionalExpenses: Math.abs(datosSheet['G58']?.v || 0),

      // Row 59: Financial Income
      financialIncome: datosSheet['G59']?.v || 0, // 532,236,000

      // Row 60: Financial Expenses
      // G60 is -11,109,000, which represents the expenses (negative)
      // Sheet 2.1 H35 = abs(DATOS!G60) = 11,109,000
      // Sheet 2.1 H36 (Financial Net) = H34 - H35 = 532,236,000 - 11,109,000 = 521,127,000
      financialExpenses: Math.abs(datosSheet['G60']?.v || 0), // 11,109,000

      // Row 63: Income Tax - stored as negative in Excel
      incomeTax: Math.abs(datosSheet['G63']?.v || 0),
    };

    console.log('\n📊 Excel DATOS Sheet Values (Column G):');
    console.log('Revenue (G47):', excelData.revenue.toLocaleString());
    console.log('Cost of Sales (G49):', excelData.costOfSales.toLocaleString());
    console.log('Staff Costs Sales (G50):', excelData.staffCostsSales.toLocaleString());
    console.log('Admin Expenses (G52):', excelData.adminExpenses.toLocaleString());
    console.log('Depreciation (G54):', excelData.depreciation.toLocaleString());
    console.log('Staff Costs Admin:', excelData.staffCostsAdmin.toLocaleString());
    console.log('Exceptional Income (G57):', excelData.exceptionalIncome.toLocaleString());
    console.log('Exceptional Expenses (G58):', excelData.exceptionalExpenses.toLocaleString());
    console.log('Financial Income (G59):', excelData.financialIncome.toLocaleString());
    console.log('Financial Expenses (G60):', excelData.financialExpenses.toLocaleString());
    console.log('Income Tax (G63):', excelData.incomeTax.toLocaleString());

    // Find the company and fiscal year
    const companies = await prisma.company.findMany({
      include: {
        fiscalYears: {
          where: { year: 2024 },
          include: {
            incomeStatement: true,
          },
        },
      },
    });

    if (companies.length === 0) {
      console.log('❌ No companies found in database');
      return;
    }

    const company = companies[0];
    const fiscalYear = company.fiscalYears[0];

    if (!fiscalYear) {
      console.log('❌ No fiscal year 2024 found');
      return;
    }

    console.log(`\n✏️  Updating income statement for ${company.name} - Year ${fiscalYear.year}...`);

    // Update the income statement with correct values
    await prisma.incomeStatement.update({
      where: { fiscalYearId: fiscalYear.id },
      data: {
        revenue: excelData.revenue,
        otherOperatingIncome: 0, // Not used in this Excel structure
        costOfSales: excelData.costOfSales,
        staffCostsSales: excelData.staffCostsSales,
        adminExpenses: excelData.adminExpenses,
        staffCostsAdmin: excelData.staffCostsAdmin, // 0 in this Excel
        depreciation: excelData.depreciation, // From G54
        exceptionalIncome: excelData.exceptionalIncome,
        exceptionalExpenses: excelData.exceptionalExpenses,
        financialIncome: excelData.financialIncome,
        financialExpenses: excelData.financialExpenses,
        incomeTax: excelData.incomeTax,
      },
    });

    console.log('✅ Data updated successfully!');

    // Verify the update
    console.log('\n🔍 Verifying calculations...');
    const updated = await prisma.incomeStatement.findUnique({
      where: { fiscalYearId: fiscalYear.id },
    });

    if (!updated) {
      console.log('❌ Could not retrieve updated data');
      return;
    }

    // Calculate expected results
    const revenue = Number(updated.revenue);
    const costOfSales = Number(updated.costOfSales);
    const adminExpenses = Number(updated.adminExpenses);
    const staffCostsAdmin = Number(updated.staffCostsAdmin);
    const dep = Number(updated.depreciation);
    const excIncome = Number(updated.exceptionalIncome);
    const excExpenses = Number(updated.exceptionalExpenses);
    const finIncome = Number(updated.financialIncome);
    const finExpenses = Number(updated.financialExpenses);
    const tax = Number(updated.incomeTax);

    const margenBruto = revenue - costOfSales;
    const otherOpExpenses = adminExpenses + staffCostsAdmin;
    const ebitda = margenBruto - otherOpExpenses;
    const resultAfterDep = ebitda - dep;
    const exceptionalNet = excIncome - excExpenses;
    const ebit = resultAfterDep + exceptionalNet;
    const financialNet = finIncome - finExpenses;
    const ebt = ebit + financialNet;
    const netIncome = ebt - tax;

    console.log('\n📈 Calculated Results:');
    console.log('Margen Bruto:', margenBruto.toLocaleString(), '(Expected: 10,376,337,000)');
    console.log('EBITDA:', ebitda.toLocaleString(), '(Expected: 4,820,219,000)');
    console.log('EBIT:', ebit.toLocaleString(), '(Expected: 3,290,334,000)');
    console.log('EBT:', ebt.toLocaleString(), '(Expected: 3,811,461,000)');
    console.log('Net Income:', netIncome.toLocaleString(), '(Expected: 2,607,488,000)');

    // Check against expected values
    const expected = {
      margenBruto: 10376337000,
      ebitda: 4820219000,
      ebit: 3290334000,
      ebt: 3811461000,
      netIncome: 2607488000,
    };

    const tolerance = 1; // Allow 1 unit difference due to rounding
    const checks = {
      margenBruto: Math.abs(margenBruto - expected.margenBruto) < tolerance,
      ebitda: Math.abs(ebitda - expected.ebitda) < tolerance,
      ebit: Math.abs(ebit - expected.ebit) < tolerance,
      ebt: Math.abs(ebt - expected.ebt) < tolerance,
      netIncome: Math.abs(netIncome - expected.netIncome) < tolerance,
    };

    console.log('\n✅ Validation Results:');
    console.log('Margen Bruto:', checks.margenBruto ? '✅ MATCH' : '❌ MISMATCH');
    console.log('EBITDA:', checks.ebitda ? '✅ MATCH' : '❌ MISMATCH');
    console.log('EBIT:', checks.ebit ? '✅ MATCH' : '❌ MISMATCH');
    console.log('EBT:', checks.ebt ? '✅ MATCH' : '❌ MISMATCH');
    console.log('Net Income:', checks.netIncome ? '✅ MATCH' : '❌ MISMATCH');

    const allMatch = Object.values(checks).every(v => v);
    if (allMatch) {
      console.log('\n🎉 SUCCESS! All calculations now match Excel values!');
    } else {
      console.log('\n⚠️  Some values still don\'t match. Please verify the data.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixData();
