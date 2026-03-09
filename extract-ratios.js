const XLSX = require('xlsx');
const fs = require('fs');

// Leer el archivo Excel
const workbook = XLSX.readFile('./TAXFINMHO2024.xlsx');

console.log('🔍 EXTRACCIÓN DE FÓRMULAS DE RATIOS FINANCIEROS\n');
console.log('='.repeat(80));

// Analizar la hoja CalcBal que contiene los cálculos auxiliares
if (workbook.SheetNames.includes('CalcBal')) {
  console.log('\n📐 HOJA CalcBal (Cálculos de Balance):');
  console.log('-'.repeat(80));

  const sheet = workbook.Sheets['CalcBal'];
  const range = XLSX.utils.decode_range(sheet['!ref']);

  // Buscar fórmulas en filas clave
  const keyRows = [119, 155, 156, 157, 158, 159]; // Filas que aparecen en referencias

  keyRows.forEach(rowNum => {
    console.log(`\n📍 Fila ${rowNum}:`);
    for (let C = range.s.c; C <= Math.min(range.e.c, 20); ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowNum - 1, c: C });
      const cell = sheet[cellAddress];

      if (cell && cell.f) {
        console.log(`   ${cellAddress}: ${cell.f} = ${cell.v}`);
      }
    }
  });
}

// Analizar hoja 2.4 - RATIOS FINANCIEROS
if (workbook.SheetNames.includes('2.4')) {
  console.log('\n\n📊 HOJA 2.4 - RATIOS FINANCIEROS:');
  console.log('='.repeat(80));

  const sheet = workbook.Sheets['2.4'];
  const range = XLSX.utils.decode_range(sheet['!ref']);

  // Estructura para guardar los ratios encontrados
  const ratios = {};

  // Buscar por filas específicas donde están los ratios
  for (let R = range.s.r; R <= Math.min(range.e.r, 200); ++R) {
    // Columna E (índice 4) suele tener nombres de ratios
    const nameCell = sheet[XLSX.utils.encode_cell({ r: R, c: 4 })];

    if (nameCell && nameCell.v && typeof nameCell.v === 'string') {
      const ratioName = nameCell.v.trim();

      // Solo procesar si parece un nombre de ratio
      if (ratioName.length > 3 && ratioName.length < 100) {
        // Buscar fórmulas en columna H (2024, índice 7)
        const formulaCell = sheet[XLSX.utils.encode_cell({ r: R, c: 7 })];

        if (formulaCell && formulaCell.f) {
          ratios[ratioName] = {
            row: R + 1,
            formula: formulaCell.f,
            value: formulaCell.v,
            cells: {}
          };

          // También capturar columnas J, L, N, P (otros años)
          [9, 11, 13, 15].forEach(colIdx => {
            const yearCell = sheet[XLSX.utils.encode_cell({ r: R, c: colIdx })];
            if (yearCell && yearCell.f) {
              const year = colIdx === 9 ? '2023' : colIdx === 11 ? '2022' : colIdx === 13 ? '2021' : '2020';
              ratios[ratioName].cells[year] = {
                formula: yearCell.f,
                value: yearCell.v
              };
            }
          });
        }
      }
    }
  }

  console.log('\n📋 RATIOS ENCONTRADOS CON FÓRMULAS:');
  console.log('-'.repeat(80));

  Object.keys(ratios).forEach(name => {
    const ratio = ratios[name];
    console.log(`\n🔹 ${name} (Fila ${ratio.row})`);
    console.log(`   Fórmula 2024: ${ratio.formula}`);
    console.log(`   Valor: ${ratio.value}`);

    if (Object.keys(ratio.cells).length > 0) {
      console.log(`   Otros años:`);
      Object.keys(ratio.cells).forEach(year => {
        console.log(`     ${year}: ${ratio.cells[year].formula} = ${ratio.cells[year].value}`);
      });
    }
  });

  // Guardar ratios en archivo JSON
  fs.writeFileSync(
    './ratios-formulas.json',
    JSON.stringify(ratios, null, 2),
    'utf8'
  );

  console.log('\n\n✅ Fórmulas de ratios guardadas en: ratios-formulas.json');
}

// Analizar hoja 2.1 - Cuenta de Resultados
if (workbook.SheetNames.includes('2.1')) {
  console.log('\n\n📊 HOJA 2.1 - CUENTA DE RESULTADOS (P&G):');
  console.log('='.repeat(80));

  const sheet = workbook.Sheets['2.1'];
  const range = XLSX.utils.decode_range(sheet['!ref']);

  const importantes = ['EBITDA', 'EBIT', 'Margen Bruto', 'Margen EBITDA', 'Resultado'];

  for (let R = range.s.r; R <= Math.min(range.e.r, 100); ++R) {
    const nameCell = sheet[XLSX.utils.encode_cell({ r: R, c: 4 })]; // Columna E

    if (nameCell && nameCell.v && typeof nameCell.v === 'string') {
      const name = nameCell.v.trim();

      // Buscar conceptos importantes
      if (importantes.some(keyword => name.toLowerCase().includes(keyword.toLowerCase()))) {
        const formulaCell = sheet[XLSX.utils.encode_cell({ r: R, c: 7 })]; // Columna H (2024)

        if (formulaCell && formulaCell.f) {
          console.log(`\n🔹 ${name} (Fila ${R + 1})`);
          console.log(`   Fórmula: ${formulaCell.f}`);
          console.log(`   Valor: ${formulaCell.v}`);
        }
      }
    }
  }
}

// Analizar hoja 2.2 - Análisis de Balances
if (workbook.SheetNames.includes('2.2')) {
  console.log('\n\n📊 HOJA 2.2 - ANÁLISIS DE BALANCES:');
  console.log('='.repeat(80));

  const sheet = workbook.Sheets['2.2'];
  const range = XLSX.utils.decode_range(sheet['!ref']);

  const importantes = ['Fondo de Maniobra', 'NOF', 'Capital Circulante', 'Total Activo', 'Total Pasivo', 'Patrimonio Neto'];

  for (let R = range.s.r; R <= Math.min(range.e.r, 100); ++R) {
    const nameCell = sheet[XLSX.utils.encode_cell({ r: R, c: 4 })]; // Columna E

    if (nameCell && nameCell.v && typeof nameCell.v === 'string') {
      const name = nameCell.v.trim();

      // Buscar conceptos importantes
      if (importantes.some(keyword => name.toLowerCase().includes(keyword.toLowerCase()))) {
        const formulaCell = sheet[XLSX.utils.encode_cell({ r: R, c: 7 })]; // Columna H (2024)

        if (formulaCell) {
          console.log(`\n🔹 ${name} (Fila ${R + 1})`);
          console.log(`   Fórmula: ${formulaCell.f || 'VALOR DIRECTO'}`);
          console.log(`   Valor: ${formulaCell.v}`);
        }
      }
    }
  }
}

console.log('\n\n' + '='.repeat(80));
console.log('✅ EXTRACCIÓN COMPLETADA\n');
