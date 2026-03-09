/**
 * Script para extraer datos del Excel TAXFINMHO2024.xlsx
 * Extrae datos de la empresa de prueba para compararlos con los cálculos de la app
 */

const XLSX = require('xlsx');
const path = require('path');

// Leer el archivo Excel
const excelPath = path.join(__dirname, '../../TAXFINMHO2024.xlsx');
console.log('📁 Leyendo archivo:', excelPath);

const workbook = XLSX.readFile(excelPath);

// Función helper para obtener el valor de una celda
function getCellValue(sheet, cell) {
  if (!sheet[cell]) return null;
  const cellData = sheet[cell];
  if (cellData.t === 'n') return cellData.v; // número
  if (cellData.t === 's') return cellData.v; // string
  if (cellData.t === 'b') return cellData.v; // boolean
  return cellData.w || cellData.v; // valor formateado o valor crudo
}

// 1. Extraer información de la empresa desde INDICE
console.log('\n📋 DATOS DE LA EMPRESA (Hoja INDICE)');
const indiceSheet = workbook.Sheets['INDICE'];
const companyName = getCellValue(indiceSheet, 'G19');
const baseYear = getCellValue(indiceSheet, 'H21');
console.log('Empresa:', companyName);
console.log('Año base:', baseYear);

// 2. Extraer datos financieros desde hoja DATOS
console.log('\n💰 DATOS FINANCIEROS (Hoja DATOS)');
const datosSheet = workbook.Sheets['DATOS'];

// Años en columnas G, H, I, J, K (2024, 2023, 2022, 2021, 2020)
const yearColumns = ['G', 'H', 'I', 'J', 'K'];
const years = [2024, 2023, 2022, 2021, 2020];

const financialData = {};

years.forEach((year, index) => {
  const col = yearColumns[index];

  financialData[year] = {
    // BALANCE - ACTIVO NO CORRIENTE
    tangibleAssets: getCellValue(datosSheet, `${col}23`),
    intangibleAssets: getCellValue(datosSheet, `${col}28`),
    financialInvestmentsLp: getCellValue(datosSheet, `${col}30`),
    otherNoncurrentAssets: getCellValue(datosSheet, `${col}32`),

    // BALANCE - ACTIVO CORRIENTE
    inventory: getCellValue(datosSheet, `${col}40`),
    accountsReceivable: getCellValue(datosSheet, `${col}45`),
    otherReceivables: getCellValue(datosSheet, `${col}46`),
    taxReceivables: getCellValue(datosSheet, `${col}47`),
    cashEquivalents: getCellValue(datosSheet, `${col}51`),

    // BALANCE - PATRIMONIO NETO
    shareCapital: getCellValue(datosSheet, `${col}62`),
    reserves: getCellValue(datosSheet, `${col}63`),
    retainedEarnings: getCellValue(datosSheet, `${col}67`),
    treasuryStock: getCellValue(datosSheet, `${col}68`),

    // BALANCE - PASIVO NO CORRIENTE
    provisionsLp: getCellValue(datosSheet, `${col}79`),
    bankDebtLp: getCellValue(datosSheet, `${col}80`),
    otherLiabilitiesLp: getCellValue(datosSheet, `${col}83`),

    // BALANCE - PASIVO CORRIENTE
    provisionsSp: getCellValue(datosSheet, `${col}91`),
    bankDebtSp: getCellValue(datosSheet, `${col}92`),
    accountsPayable: getCellValue(datosSheet, `${col}95`),
    taxLiabilities: getCellValue(datosSheet, `${col}97`),
    otherLiabilitiesSp: getCellValue(datosSheet, `${col}99`),

    // CUENTA DE P&G
    revenue: getCellValue(datosSheet, `${col}116`),
    otherOperatingIncome: getCellValue(datosSheet, `${col}117`),
    costOfSales: getCellValue(datosSheet, `${col}121`),
    staffCostsSales: getCellValue(datosSheet, `${col}122`),
    adminExpenses: getCellValue(datosSheet, `${col}127`),
    staffCostsAdmin: getCellValue(datosSheet, `${col}128`),
    depreciation: getCellValue(datosSheet, `${col}132`),
    exceptionalIncome: getCellValue(datosSheet, `${col}139`),
    exceptionalExpenses: getCellValue(datosSheet, `${col}140`),
    financialIncome: getCellValue(datosSheet, `${col}145`),
    financialExpenses: getCellValue(datosSheet, `${col}146`),
    incomeTax: getCellValue(datosSheet, `${col}152`),

    // FLUJO DE EFECTIVO
    operatingCashFlow: getCellValue(datosSheet, `${col}163`),
    cfEbtAdjustments: getCellValue(datosSheet, `${col}164`),
    cfWorkingCapital: getCellValue(datosSheet, `${col}169`),
    cfInvestments: getCellValue(datosSheet, `${col}175`),
    cfDivestments: getCellValue(datosSheet, `${col}176`),
    cfDebtObtained: getCellValue(datosSheet, `${col}182`),
    cfDebtRepaid: getCellValue(datosSheet, `${col}183`),
    cfDividendsPaid: getCellValue(datosSheet, `${col}184`),

    // DATOS ADICIONALES
    sharesOutstanding: getCellValue(datosSheet, `${col}196`),
    sharePrice: getCellValue(datosSheet, `${col}197`),
    dividendsPerShare: getCellValue(datosSheet, `${col}198`),
    averageEmployees: getCellValue(datosSheet, `${col}200`),
  };
});

// Mostrar datos del año 2024 como ejemplo
console.log('\n📊 Datos del año 2024:');
console.log('Revenue:', financialData[2024].revenue);
console.log('Cash:', financialData[2024].cashEquivalents);
console.log('Inventory:', financialData[2024].inventory);
console.log('Accounts Receivable:', financialData[2024].accountsReceivable);
console.log('Employees:', financialData[2024].averageEmployees);

// 3. Extraer ratios calculados desde hoja 2.4
console.log('\n📈 RATIOS ESPERADOS (Hoja 2.4)');
const ratiosSheet = workbook.Sheets['2.4'];

const expectedRatios = {};

years.forEach((year, index) => {
  // Columnas H, J, L, N, P para años 2024, 2023, 2022, 2021, 2020
  const ratioCols = ['H', 'J', 'L', 'N', 'P'];
  const col = ratioCols[index];

  expectedRatios[year] = {
    // Liquidez (filas 52-54)
    currentRatio: getCellValue(ratiosSheet, `${col}52`),
    quickRatio: getCellValue(ratiosSheet, `${col}53`),
    cashRatio: getCellValue(ratiosSheet, `${col}54`),

    // Endeudamiento (filas 9-11, 39-44)
    capitalizationRatio: getCellValue(ratiosSheet, `${col}9`),
    debtToEquity: getCellValue(ratiosSheet, `${col}10`),
    debtToAssets: getCellValue(ratiosSheet, `${col}40`),
    debtToEbitda: getCellValue(ratiosSheet, `${col}42`),

    // Rentabilidad (filas 100-103)
    roe: getCellValue(ratiosSheet, `${col}100`),
    roa: getCellValue(ratiosSheet, `${col}101`),
    roi: getCellValue(ratiosSheet, `${col}102`),
    ros: getCellValue(ratiosSheet, `${col}103`),

    // Márgenes (desde hoja 2.1)
    // Actividad (filas 63-79)
    assetTurnover: getCellValue(ratiosSheet, `${col}63`),
    inventoryTurnover: getCellValue(ratiosSheet, `${col}71`),
    daysSalesOutstanding: getCellValue(ratiosSheet, `${col}75`),
    daysPayableOutstanding: getCellValue(ratiosSheet, `${col}77`),
    daysInventoryOutstanding: getCellValue(ratiosSheet, `${col}76`),
  };
});

// Mostrar ratios del año 2024
console.log('\n📊 Ratios esperados para 2024:');
console.log('Current Ratio:', expectedRatios[2024].currentRatio);
console.log('Quick Ratio:', expectedRatios[2024].quickRatio);
console.log('Cash Ratio:', expectedRatios[2024].cashRatio);
console.log('Debt to Equity:', expectedRatios[2024].debtToEquity);
console.log('ROE:', expectedRatios[2024].roe);
console.log('ROA:', expectedRatios[2024].roa);
console.log('Asset Turnover:', expectedRatios[2024].assetTurnover);

// 4. Exportar datos a JSON para usarlos en la app
const outputData = {
  company: {
    name: companyName,
    baseYear: baseYear,
    taxId: 'XX.XXX.XXX-X', // Ajustar según datos reales
    industry: 'Laboratorio Farmacéutico',
    country: 'CL',
    currency: 'CLP',
  },
  financialData,
  expectedRatios,
};

const fs = require('fs');
const outputPath = path.join(__dirname, 'excel-test-data.json');
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

console.log('\n✅ Datos exportados a:', outputPath);
console.log('\n📝 Resumen:');
console.log('- Empresa:', companyName);
console.log('- Años con datos:', years.join(', '));
console.log('- Archivo generado: excel-test-data.json');
