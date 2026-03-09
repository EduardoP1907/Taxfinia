const XLSX = require('xlsx');
const wb = XLSX.readFile('../TAXFINMHO2024.xlsx');
const ws41 = wb.Sheets['4.1'];

console.log('=== Rows 20-40 in Sheet 4.1 (Column G) ===\n');
for(let i=20; i<=40; i++) {
  const cellE = 'E' + i;
  const cellF = 'F' + i;
  const cellG = 'G' + i;
  const labelE = ws41[cellE]?.v;
  const labelF = ws41[cellF]?.v;
  const value = ws41[cellG]?.v;
  const formula = ws41[cellG]?.f;

  // Show row if it has a label or a value
  if(labelE || labelF || (value !== undefined && value !== null)) {
    const label = labelF || labelE || '';
    console.log('Row ' + i + ':', label);
    if(value !== undefined && value !== null) {
      console.log('  Value:', typeof value === 'number' ? value.toLocaleString() : value);
    }
    if(formula) {
      console.log('  Formula:', formula);
    }
    console.log('');
  }
}

console.log('=== Análisis de FCF ===');
console.log('G20 (NOPAT):', ws41['G20']?.v?.toLocaleString());
console.log('G35 (Variación):', ws41['G35']?.v?.toLocaleString());
console.log('G36 (FCF = G20 - G35):', ws41['G36']?.v?.toLocaleString());
console.log('');
console.log('Cálculo: ' + ws41['G20']?.v?.toLocaleString() + ' - (' + ws41['G35']?.v?.toLocaleString() + ') = ' + ws41['G36']?.v?.toLocaleString());
