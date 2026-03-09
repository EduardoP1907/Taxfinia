const XLSX = require('xlsx');
const wb = XLSX.readFile('../TAXFINMHO2024.xlsx');
const ws22 = wb.Sheets['2.2'];

console.log('=== Sheet 2.2 - Column Headers (Row 6) ===\n');

// Check columns G through L for year headers
const columns = ['G', 'H', 'I', 'J', 'K', 'L'];
for (const col of columns) {
  const cell = `${col}6`;
  const value = ws22[cell]?.v;
  if (value !== undefined) {
    console.log(`${col}6: ${value}`);
  }
}

console.log('\n=== Checking Row 3 for additional context ===\n');
for (const col of columns) {
  const cell = `${col}3`;
  const value = ws22[cell]?.v;
  if (value !== undefined) {
    console.log(`${col}3: ${value}`);
  }
}
