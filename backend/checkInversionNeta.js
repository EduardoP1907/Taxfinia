const XLSX = require('xlsx');
const wb = XLSX.readFile('../TAXFINMHO2024.xlsx');

// Check sheet 4.1 for G35 reference
const ws41 = wb.Sheets['4.1'];
console.log('=== Sheet 4.1 - Cell G35 ===');
console.log('G35 Value:', ws41['G35']?.v?.toLocaleString());
console.log('G35 Formula:', ws41['G35']?.f);
console.log('');

// Now check sheet 2.2 for H19 and J19
const ws22 = wb.Sheets['2.2'];
console.log('=== Sheet 2.2 - Cells Referenced by G35 ===');
console.log('');

// Check around row 19 to understand context
console.log('Row 18-20 context:');
for (let row = 18; row <= 20; row++) {
  const cellE = `E${row}`;
  const cellF = `F${row}`;
  const cellH = `H${row}`;
  const cellJ = `J${row}`;

  const labelE = ws22[cellE]?.v;
  const labelF = ws22[cellF]?.v;
  const valueH = ws22[cellH]?.v;
  const valueJ = ws22[cellJ]?.v;
  const formulaH = ws22[cellH]?.f;
  const formulaJ = ws22[cellJ]?.f;

  if (labelE || labelF || valueH !== undefined || valueJ !== undefined) {
    const label = labelF || labelE || '';
    console.log(`\nRow ${row}: ${label}`);
    if (valueH !== undefined) {
      console.log(`  H${row} Value: ${typeof valueH === 'number' ? valueH.toLocaleString() : valueH}`);
      if (formulaH) console.log(`  H${row} Formula: ${formulaH}`);
    }
    if (valueJ !== undefined) {
      console.log(`  J${row} Value: ${typeof valueJ === 'number' ? valueJ.toLocaleString() : valueJ}`);
      if (formulaJ) console.log(`  J${row} Formula: ${formulaJ}`);
    }
  }
}

console.log('\n=== Calculation ===');
const h19 = ws22['H19']?.v || 0;
const j19 = ws22['J19']?.v || 0;
const inversionNeta = h19 - j19;
console.log(`H19: ${h19.toLocaleString()}`);
console.log(`J19: ${j19.toLocaleString()}`);
console.log(`Inversión Neta (H19 - J19): ${inversionNeta.toLocaleString()}`);
console.log('');

// Verify with G35
const g35 = ws41['G35']?.v;
console.log(`G35 (from 4.1): ${g35?.toLocaleString()}`);
console.log(`Match: ${Math.abs(inversionNeta - g35) < 1 ? 'YES' : 'NO'}`);
