const XLSX = require('xlsx');
const fs = require('fs');

// Leer el archivo Excel
const workbook = XLSX.readFile('./TAXFINMHO2024.xlsx');

console.log('📊 ANÁLISIS DEL ARCHIVO EXCEL TAXFINMHO2024\n');
console.log('=' .repeat(80));

// Listar todas las hojas
console.log('\n📑 HOJAS DEL ARCHIVO:');
console.log('-'.repeat(80));
workbook.SheetNames.forEach((sheetName, index) => {
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const rows = range.e.r + 1;
  const cols = range.e.c + 1;
  console.log(`${index + 1}. ${sheetName.padEnd(30)} (${rows} filas × ${cols} columnas)`);
});

// Función para obtener fórmulas de una celda
function getFormulas(sheet, cellAddress) {
  const cell = sheet[cellAddress];
  if (!cell) return null;

  return {
    address: cellAddress,
    value: cell.v,
    formula: cell.f || null,
    type: cell.t
  };
}

// Analizar hojas clave
const sheetsToAnalyze = ['DATOS', '2.4', 'RESUMEN VALOR', '2.1', '2.2', '2.3'];

console.log('\n\n📐 ANÁLISIS DETALLADO DE HOJAS CLAVE:');
console.log('='.repeat(80));

sheetsToAnalyze.forEach(sheetName => {
  if (!workbook.SheetNames.includes(sheetName)) {
    console.log(`\n⚠️  Hoja "${sheetName}" no encontrada\n`);
    return;
  }

  console.log(`\n\n🔍 HOJA: ${sheetName}`);
  console.log('-'.repeat(80));

  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref']);

  // Convertir a JSON para análisis
  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false
  });

  console.log(`Dimensiones: ${range.e.r + 1} filas × ${range.e.c + 1} columnas`);

  // Buscar fórmulas en la hoja
  const formulas = [];
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = sheet[cellAddress];

      if (cell && cell.f) {
        formulas.push({
          address: cellAddress,
          formula: cell.f,
          value: cell.v,
          row: R + 1,
          col: String.fromCharCode(65 + C)
        });
      }
    }
  }

  if (formulas.length > 0) {
    console.log(`\n📝 FÓRMULAS ENCONTRADAS: ${formulas.length}`);
    console.log('\nPrimeras 20 fórmulas:');
    formulas.slice(0, 20).forEach(f => {
      console.log(`  ${f.address}: ${f.formula} = ${f.value}`);
    });

    if (formulas.length > 20) {
      console.log(`  ... y ${formulas.length - 20} fórmulas más`);
    }
  } else {
    console.log('\n⚠️  No se encontraron fórmulas en esta hoja');
  }

  // Mostrar primeras filas de datos
  console.log('\n📊 PRIMERAS 10 FILAS:');
  data.slice(0, 10).forEach((row, idx) => {
    const rowStr = row.map(cell =>
      cell === null ? '---' :
      typeof cell === 'number' ? cell.toFixed(2) :
      String(cell).substring(0, 15)
    ).join(' | ');
    console.log(`  Fila ${idx + 1}: ${rowStr}`);
  });
});

// Análisis específico de la hoja de RATIOS (2.4)
if (workbook.SheetNames.includes('2.4')) {
  console.log('\n\n💡 ANÁLISIS DETALLADO DE RATIOS (Hoja 2.4):');
  console.log('='.repeat(80));

  const sheet = workbook.Sheets['2.4'];
  const range = XLSX.utils.decode_range(sheet['!ref']);

  // Buscar celdas con nombres de ratios comunes
  const ratioKeywords = [
    'ROE', 'ROA', 'ROI', 'ROS',
    'Liquidez', 'Solvencia', 'Endeudamiento',
    'EBITDA', 'EBIT', 'Margen',
    'Rotación', 'Cobro', 'Pago',
    'Autonomía', 'Capitalización'
  ];

  console.log('\n🔎 Buscando ratios financieros conocidos...\n');

  for (let R = range.s.r; R <= Math.min(range.e.r, 100); ++R) {
    for (let C = range.s.c; C <= Math.min(range.e.c, 10); ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = sheet[cellAddress];

      if (cell && cell.v && typeof cell.v === 'string') {
        const cellValue = cell.v.toLowerCase();

        ratioKeywords.forEach(keyword => {
          if (cellValue.includes(keyword.toLowerCase())) {
            // Buscar la fórmula en las celdas cercanas (misma fila, columnas siguientes)
            const formulaCells = [];
            for (let colOffset = 1; colOffset <= 5; colOffset++) {
              const formulaAddr = XLSX.utils.encode_cell({ r: R, c: C + colOffset });
              const formulaCell = sheet[formulaAddr];
              if (formulaCell && formulaCell.f) {
                formulaCells.push({
                  addr: formulaAddr,
                  formula: formulaCell.f,
                  value: formulaCell.v
                });
              }
            }

            if (formulaCells.length > 0) {
              console.log(`📌 ${cell.v} (${cellAddress}):`);
              formulaCells.forEach(fc => {
                console.log(`   ${fc.addr}: ${fc.formula} = ${fc.value}`);
              });
              console.log('');
            }
          }
        });
      }
    }
  }
}

// Guardar análisis completo en archivo
const analysisData = {
  sheets: workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    const formulas = [];
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellAddress];

        if (cell && cell.f) {
          formulas.push({
            address: cellAddress,
            formula: cell.f,
            value: cell.v,
            type: cell.t
          });
        }
      }
    }

    return {
      name,
      dimensions: {
        rows: range.e.r + 1,
        cols: range.e.c + 1
      },
      formulas: formulas
    };
  })
};

fs.writeFileSync(
  './excel-analysis.json',
  JSON.stringify(analysisData, null, 2),
  'utf8'
);

console.log('\n\n✅ ANÁLISIS COMPLETO');
console.log('='.repeat(80));
console.log('📄 El análisis completo se guardó en: excel-analysis.json');
console.log(`📊 Total de hojas: ${workbook.SheetNames.length}`);
console.log(`📐 Total de fórmulas: ${analysisData.sheets.reduce((sum, s) => sum + s.formulas.length, 0)}`);
console.log('\n');
