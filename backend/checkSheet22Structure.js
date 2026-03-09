const XLSX = require('xlsx');
const wb = XLSX.readFile('../TAXFINMHO2024.xlsx');
const ws22 = wb.Sheets['2.2'];

console.log('=== Sheet 2.2 - First 12 rows, columns G-L ===\n');

const columns = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

for (let row = 1; row <= 12; row++) {
  let hasData = false;
  let rowData = `Row ${row}: `;

  for (const col of columns) {
    const cell = `${col}${row}`;
    const value = ws22[cell]?.v;
    if (value !== undefined && value !== null && value !== '') {
      hasData = true;
      rowData += `${col}=${value} | `;
    }
  }

  if (hasData) {
    console.log(rowData);
  }
}

console.log('\n=== Focus on H19 and J19 context ===');
console.log('H19 (Total Activo year 1):', ws22['H19']?.v?.toLocaleString());
console.log('J19 (Total Activo year 2):', ws22['J19']?.v?.toLocaleString());
console.log('Difference (H19 - J19):', (ws22['H19']?.v - ws22['J19']?.v)?.toLocaleString());
