import * as projFormulas from './src/utils/projections';

console.log('=== Test de Cálculos con solo Revenue ===\n');

const testData = {
  revenue: 18572906220,
  costOfSales: 0,
  otherOperatingExpenses: 0,
  depreciation: 0,
  exceptionalNet: 0,
  financialIncome: 0,
  financialExpenses: 0,
  incomeTax: 0,
  totalAssets: 14049314000,
  equity: 5907534000,
  totalLiabilities: 8141780000,
};

console.log('Datos de entrada:');
console.log('Revenue:', testData.revenue.toLocaleString());
console.log('Cost of Sales:', testData.costOfSales);
console.log('Other Operating Expenses:', testData.otherOperatingExpenses);
console.log('Depreciation:', testData.depreciation);
console.log('');

const ebitda = projFormulas.calculateEBITDA(
  testData.revenue,
  testData.costOfSales,
  testData.otherOperatingExpenses
);

console.log('EBITDA = Revenue - CostOfSales - OtherOperatingExpenses');
console.log('EBITDA =', testData.revenue.toLocaleString(), '- 0 - 0');
console.log('EBITDA =', ebitda.toLocaleString());
console.log('');

const ebit = projFormulas.calculateEBIT(
  ebitda,
  testData.depreciation,
  testData.exceptionalNet
);

console.log('EBIT = EBITDA - Depreciation + ExceptionalNet');
console.log('EBIT =', ebitda.toLocaleString(), '- 0 + 0');
console.log('EBIT =', ebit.toLocaleString());
console.log('');

console.log('❌ PROBLEMA: Cuando todos los costos son 0, EBITDA = Revenue');
console.log('Esto NO es correcto para el año base.');
console.log('');
console.log('=== Valores Reales del Excel (Año 2024) ===');
console.log('Revenue: 18,572,906,220');
console.log('Cost of Sales: ¿?');
console.log('Operating Expenses: ¿?');
console.log('Depreciation: 1,094,400,000');
console.log('EBITDA: 5,479,134,000');
console.log('EBIT: 4,384,734,000');
