const XLSX = require('xlsx');
const wb = XLSX.readFile('../TAXFINMHO2024.xlsx');
const ws41 = wb.Sheets['4.1'];

console.log('=== Hoja 4.1 - Estructura completa del Balance ===\n');

// Check rows 1-10 for Total Activo
console.log('Buscando Total Activo en filas 1-40:\n');
for (let row = 1; row <= 40; row++) {
  const cellE = `E${row}`;
  const cellF = `F${row}`;
  const cellG = `G${row}`;

  const labelE = ws41[cellE]?.v;
  const labelF = ws41[cellF]?.v;
  const valueG = ws41[cellG]?.v;
  const formulaG = ws41[cellG]?.f;

  // Look for "Total Activo" or "ACTIVO"
  if (labelE?.toString().toUpperCase().includes('ACTIVO') ||
      labelF?.toString().toUpperCase().includes('ACTIVO')) {
    console.log(`Row ${row}:`);
    if (labelE) console.log(`  E${row}: ${labelE}`);
    if (labelF) console.log(`  F${row}: ${labelF}`);
    if (valueG !== undefined) {
      console.log(`  G${row} Value: ${typeof valueG === 'number' ? valueG.toLocaleString() : valueG}`);
      if (formulaG) console.log(`  G${row} Formula: ${formulaG}`);
    }
    console.log('');
  }
}

console.log('\n=== Análisis de G35 (Inversión Neta) ===');
const g35Value = ws41['G35']?.v;
const g35Formula = ws41['G35']?.f;
console.log('G35 Value:', g35Value?.toLocaleString());
console.log('G35 Formula:', g35Formula);
console.log('');

// Check if there's a column for previous year in 4.1
console.log('=== Verificando si hay columna de año anterior en 4.1 ===');
console.log('Headers (row 6):');
const columns = ['F', 'G', 'H', 'I', 'J', 'K', 'L'];
for (const col of columns) {
  const cell = `${col}6`;
  const value = ws41[cell]?.v;
  if (value !== undefined && value !== null && value !== '') {
    console.log(`  ${col}6: ${value}`);
  }
}

console.log('');
console.log('=== Conclusión ===');
console.log('G35 hace referencia a:', g35Formula);
console.log('Esto significa que G35 NO está en 4.1, sino que viene de 2.2 (Balance Sheet analysis)');
console.log('');
console.log('Para calcular FCF en 4.1, necesitamos:');
console.log('  1. NOPAT (G20) - está en 4.1');
console.log('  2. Total Activo año actual (G7 probablemente) - está en 4.1');
console.log('  3. Total Activo año anterior - NO está directamente en 4.1, viene de 2.2');
