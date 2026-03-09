/**
 * Script para obtener datos exactos del Excel para ingresar manualmente
 */

const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../../TAXFINMHO2024.xlsx');
const workbook = XLSX.readFile(excelPath);

const datosSheet = workbook.Sheets['DATOS'];

// Helper para obtener valor
function getValue(cell) {
  if (!datosSheet[cell]) return null;
  const cellData = datosSheet[cell];
  // Si es fórmula, devolver el valor calculado
  if (cellData.v !== undefined) return cellData.v;
  if (cellData.w !== undefined) return cellData.w;
  return null;
}

// Años en columnas G, H, I, J, K
const columns = ['G', 'H', 'I', 'J', 'K'];
const years = [2024, 2023, 2022, 2021, 2020];

console.log('═'.repeat(80));
console.log('DATOS PARA COPIAR EN LA APLICACIÓN WEB');
console.log('Empresa: LABORATORIO BARNAFI KRAUSE');
console.log('═'.repeat(80));

// Vamos a imprimir año por año
years.forEach((year, yearIndex) => {
  const col = columns[yearIndex];

  console.log('\n');
  console.log('█'.repeat(80));
  console.log(`█  AÑO ${year}`.padEnd(79) + '█');
  console.log('█'.repeat(80));

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 1. BALANCE DE SITUACIÓN - ACTIVO NO CORRIENTE                              │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log(`\n📌 Inmovilizado Material (Tangible Assets):`);
  console.log(`   Celda: ${col}11`);
  console.log(`   Valor: ${getValue(`${col}11`) || 0}`);

  console.log(`\n📌 Inmovilizado Inmaterial (Intangible Assets):`);
  console.log(`   Celda: ${col}12`);
  console.log(`   Valor: ${getValue(`${col}12`) || 0}`);

  console.log(`\n📌 Inversiones Financieras LP:`);
  console.log(`   Celda: ${col}13`);
  console.log(`   Valor: ${getValue(`${col}13`) || 0}`);

  console.log(`\n📌 Otro Realizable LP:`);
  console.log(`   Celda: ${col}14`);
  console.log(`   Valor: ${getValue(`${col}14`) || 0}`);

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 2. BALANCE DE SITUACIÓN - ACTIVO CORRIENTE                                 │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log(`\n📌 Existencias (Inventory):`);
  console.log(`   Celda: ${col}16`);
  console.log(`   Valor: ${getValue(`${col}16`) || 0}`);

  console.log(`\n📌 Clientes (Accounts Receivable):`);
  console.log(`   Celda: ${col}18`);
  console.log(`   Valor: ${getValue(`${col}18`) || 0}`);

  console.log(`\n📌 Otros Deudores (Other Receivables):`);
  console.log(`   Celda: ${col}19`);
  console.log(`   Valor: ${getValue(`${col}19`) || 0}`);

  console.log(`\n📌 Hacienda Deudora (Tax Receivables):`);
  console.log(`   Celda: ${col}20`);
  console.log(`   Valor: ${getValue(`${col}20`) || 0}`);

  console.log(`\n📌 Disponible (Cash & Equivalents):`);
  console.log(`   Celda: ${col}22`);
  console.log(`   Valor: ${getValue(`${col}22`) || 0}`);

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 3. BALANCE DE SITUACIÓN - PATRIMONIO NETO                                  │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log(`\n📌 Capital Social (Share Capital):`);
  console.log(`   Celda: ${col}25`);
  console.log(`   Valor: ${getValue(`${col}25`) || 0}`);

  console.log(`\n📌 Reservas (Reserves):`);
  console.log(`   Celda: ${col}26`);
  console.log(`   Valor: ${getValue(`${col}26`) || 0}`);

  console.log(`\n📌 Resultados Ejercicios Anteriores (Retained Earnings):`);
  console.log(`   Celda: ${col}27`);
  console.log(`   Valor: ${getValue(`${col}27`) || 0}`);

  console.log(`\n📌 Acciones Propias (Treasury Stock):`);
  console.log(`   Celda: ${col}28`);
  console.log(`   Valor: ${getValue(`${col}28`) || 0}`);

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 4. BALANCE DE SITUACIÓN - PASIVO NO CORRIENTE (LP)                         │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log(`\n📌 Provisiones LP:`);
  console.log(`   Celda: ${col}31`);
  console.log(`   Valor: ${getValue(`${col}31`) || 0}`);

  console.log(`\n📌 Deudas con Entidades de Crédito LP:`);
  console.log(`   Celda: ${col}32`);
  console.log(`   Valor: ${getValue(`${col}32`) || 0}`);

  console.log(`\n📌 Otras Deudas LP:`);
  console.log(`   Celda: ${col}34`);
  console.log(`   Valor: ${getValue(`${col}34`) || 0}`);

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 5. BALANCE DE SITUACIÓN - PASIVO CORRIENTE (CP)                            │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log(`\n📌 Provisiones CP:`);
  console.log(`   Celda: ${col}37`);
  console.log(`   Valor: ${getValue(`${col}37`) || 0}`);

  console.log(`\n📌 Deudas con Entidades de Crédito CP:`);
  console.log(`   Celda: ${col}38`);
  console.log(`   Valor: ${getValue(`${col}38`) || 0}`);

  console.log(`\n📌 Proveedores (Accounts Payable):`);
  console.log(`   Celda: ${col}39`);
  console.log(`   Valor: ${getValue(`${col}39`) || 0}`);

  console.log(`\n📌 Hacienda Acreedora (Tax Liabilities):`);
  console.log(`   Celda: ${col}40`);
  console.log(`   Valor: ${getValue(`${col}40`) || 0}`);

  console.log(`\n📌 Otras Deudas CP:`);
  console.log(`   Celda: ${col}41`);
  console.log(`   Valor: ${getValue(`${col}41`) || 0}`);

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 6. CUENTA DE PÉRDIDAS Y GANANCIAS                                          │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log(`\n📌 Ingresos por Ventas (Revenue):`);
  console.log(`   Celda: ${col}45`);
  console.log(`   Valor: ${getValue(`${col}45`) || 0}`);

  console.log(`\n📌 Otros Ingresos de Explotación:`);
  console.log(`   Celda: ${col}46`);
  console.log(`   Valor: ${getValue(`${col}46`) || 0}`);

  console.log(`\n📌 Coste de las Ventas (Cost of Sales):`);
  console.log(`   Celda: ${col}48`);
  console.log(`   Valor: ${getValue(`${col}48`) || 0}`);

  console.log(`\n📌 Gastos de Personal - Ventas:`);
  console.log(`   Celda: ${col}49`);
  console.log(`   Valor: ${getValue(`${col}49`) || 0}`);

  console.log(`\n📌 Gastos de Administración:`);
  console.log(`   Celda: ${col}51`);
  console.log(`   Valor: ${getValue(`${col}51`) || 0}`);

  console.log(`\n📌 Gastos de Personal - Administración:`);
  console.log(`   Celda: ${col}52`);
  console.log(`   Valor: ${getValue(`${col}52`) || 0}`);

  console.log(`\n📌 Depreciaciones (Depreciation):`);
  console.log(`   Celda: ${col}54`);
  console.log(`   Valor: ${getValue(`${col}54`) || 0}`);

  console.log(`\n📌 Ingresos Excepcionales:`);
  console.log(`   Celda: ${col}57`);
  console.log(`   Valor: ${getValue(`${col}57`) || 0}`);

  console.log(`\n📌 Gastos Excepcionales:`);
  console.log(`   Celda: ${col}58`);
  console.log(`   Valor: ${getValue(`${col}58`) || 0}`);

  console.log(`\n📌 Ingresos Financieros:`);
  console.log(`   Celda: ${col}61`);
  console.log(`   Valor: ${getValue(`${col}61`) || 0}`);

  console.log(`\n📌 Gastos Financieros:`);
  console.log(`   Celda: ${col}62`);
  console.log(`   Valor: ${getValue(`${col}62`) || 0}`);

  console.log(`\n📌 Impuesto sobre Sociedades (Income Tax):`);
  console.log(`   Celda: ${col}65`);
  console.log(`   Valor: ${getValue(`${col}65`) || 0}`);

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 7. DATOS ADICIONALES                                                        │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log(`\n📌 Número de Empleados Promedio:`);
  console.log(`   Celda: ${col}70`);
  console.log(`   Valor: ${getValue(`${col}70`) || 0}`);

  console.log('\n' + '═'.repeat(80));
});

console.log('\n\n✅ INSTRUCCIONES:');
console.log('1. Abre http://localhost:5173 en tu navegador');
console.log('2. Inicia sesión o regístrate');
console.log('3. Crea una nueva empresa: "LABORATORIO BARNAFI KRAUSE"');
console.log('4. Ve a "Ingresar Datos" y selecciona el año 2024');
console.log('5. Copia los valores de arriba en cada campo correspondiente');
console.log('6. Guarda los datos');
console.log('7. Ve a "Informe" para ver los ratios calculados');
console.log('8. Compara con los ratios del Excel (hoja 2.4)\n');
