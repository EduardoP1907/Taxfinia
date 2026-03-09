const XLSX = require('xlsx');
const wb = XLSX.readFile('../TAXFINMHO2024.xlsx');
const ws = wb.Sheets['DATOS'];

console.log('Checking DATOS sheet rows 46-65:');
for(let i=46; i<=65; i++) {
  const cell = 'A' + i;
  const valCell = 'G' + i;
  const label = ws[cell]?.v || '';
  const value = ws[valCell]?.v;

  if(value !== undefined) {
    console.log(`Row ${i}: ${label} = ${value.toLocaleString()}`);
  }
}

console.log('\n=== Key breakdown ===');
console.log('G52 (direct value):', ws['G52']?.v?.toLocaleString());
console.log('G54 (Staff Admin):', ws['G54']?.v?.toLocaleString());
console.log('G52 + G54 =', (Math.abs(ws['G52']?.v || 0) + Math.abs(ws['G54']?.v || 0)).toLocaleString());
console.log('Expected total operating expenses: 5,556,118,000');
