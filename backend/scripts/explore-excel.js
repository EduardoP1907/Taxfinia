/**
 * Script para explorar la estructura del Excel y encontrar las celdas correctas
 */

const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../../TAXFINMHO2024.xlsx');
console.log('📁 Leyendo archivo:', excelPath);

const workbook = XLSX.readFile(excelPath);

console.log('\n📊 Hojas disponibles:', workbook.SheetNames.join(', '));

// Explorar hoja DATOS
console.log('\n\n🔍 EXPLORANDO HOJA "DATOS"');
const datosSheet = workbook.Sheets['DATOS'];

// Mostrar algunas celdas clave para entender la estructura
console.log('\n=== ESTRUCTURA DE COLUMNAS ===');
console.log('A1:', datosSheet['A1']?.v);
console.log('B1:', datosSheet['B1']?.v);
console.log('C1:', datosSheet['C1']?.v);
console.log('D1:', datosSheet['D1']?.v);
console.log('E1:', datosSheet['E1']?.v);
console.log('F1:', datosSheet['F1']?.v);
console.log('G1:', datosSheet['G1']?.v);
console.log('H1:', datosSheet['H1']?.v);

console.log('\n=== AÑOS (fila 2-5) ===');
for (let row = 1; row <= 10; row++) {
  const rowData = [];
  for (let col of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']) {
    const cell = `${col}${row}`;
    const value = datosSheet[cell];
    rowData.push(value ? `${col}${row}:${value.v}` : `${col}${row}:-`);
  }
  console.log(`Fila ${row}:`, rowData.join(' | '));
}

console.log('\n=== SECCIÓN BALANCE - ACTIVO (filas 15-35) ===');
for (let row = 15; row <= 35; row++) {
  const label = datosSheet[`A${row}`]?.v || datosSheet[`B${row}`]?.v || datosSheet[`C${row}`]?.v || '-';
  const value2024 = datosSheet[`G${row}`]?.v || datosSheet[`G${row}`]?.w || '-';
  if (label && label !== '-') {
    console.log(`Fila ${row}: ${label} = ${value2024}`);
  }
}

console.log('\n=== SECCIÓN P&G (filas 110-160) ===');
for (let row = 110; row <= 160; row++) {
  const label = datosSheet[`A${row}`]?.v || datosSheet[`B${row}`]?.v || datosSheet[`C${row}`]?.v || '-';
  const value2024 = datosSheet[`G${row}`]?.v || datosSheet[`G${row}`]?.w || '-';
  if (label && label !== '-' && label.length > 2) {
    console.log(`Fila ${row}: ${label} = ${value2024}`);
  }
}

// Ver estructura de hoja 2.4 (Ratios)
console.log('\n\n🔍 EXPLORANDO HOJA "2.4" (Ratios)');
const ratiosSheet = workbook.Sheets['2.4'];

console.log('\n=== ENCABEZADOS ===');
for (let col of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']) {
  const cell = `${col}1`;
  const value = ratiosSheet[cell];
  if (value) {
    console.log(`${cell}: ${value.v || value.w}`);
  }
}

console.log('\n=== RATIOS DE LIQUIDEZ (filas 50-56) ===');
for (let row = 50; row <= 56; row++) {
  const label = ratiosSheet[`C${row}`]?.v || ratiosSheet[`B${row}`]?.v || '-';
  const value2024 = ratiosSheet[`H${row}`]?.v || ratiosSheet[`H${row}`]?.w || '-';
  if (label && label !== '-') {
    console.log(`Fila ${row}: ${label} = ${value2024}`);
  }
}
