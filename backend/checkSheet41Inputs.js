const XLSX = require('xlsx');
const wb = XLSX.readFile('../TAXFINMHO2024.xlsx');
const ws41 = wb.Sheets['4.1'];

console.log('=== Hoja 4.1 - Campos de ENTRADA (Usuario debe ingresar) ===\n');

// Revisar filas 1-50 para encontrar todos los campos de entrada
for (let row = 1; row <= 50; row++) {
  const cellE = `E${row}`;
  const cellF = `F${row}`;
  const cellG = `G${row}`;

  const labelE = ws41[cellE]?.v;
  const labelF = ws41[cellF]?.v;
  const formulaG = ws41[cellG]?.f;
  const valueG = ws41[cellG]?.v;

  // Si tiene etiqueta y NO tiene fórmula en G (o sea, es input del usuario)
  const hasLabel = labelE || labelF;
  const isInput = valueG !== undefined && !formulaG;

  if (hasLabel && isInput) {
    const label = labelF || labelE || '';
    console.log(`Row ${row}: ${label}`);
    console.log(`  Valor en G${row}:`, typeof valueG === 'number' ? valueG.toLocaleString() : valueG);
    console.log('  Es INPUT del usuario (no tiene fórmula)');
    console.log('');
  }
}

console.log('\n=== Campos CALCULADOS (tienen fórmula) ===\n');
const importantRows = [11, 13, 15, 16, 17, 19, 20, 23, 36]; // Revenue, MB, EBITDA, RO, EBIT, EBT, NOPAT, Flujo Bruto, FCF

importantRows.forEach(row => {
  const cellE = `E${row}`;
  const cellF = `F${row}`;
  const cellG = `G${row}`;

  const labelE = ws41[cellE]?.v;
  const labelF = ws41[cellF]?.v;
  const formulaG = ws41[cellG]?.f;
  const valueG = ws41[cellG]?.v;

  if (labelE || labelF) {
    const label = labelF || labelE || '';
    console.log(`Row ${row}: ${label}`);
    if (formulaG) {
      console.log(`  Fórmula: ${formulaG}`);
    } else {
      console.log(`  Es INPUT (no hay fórmula)`);
    }
    console.log(`  Valor: ${typeof valueG === 'number' ? valueG.toLocaleString() : valueG}`);
    console.log('');
  }
});
