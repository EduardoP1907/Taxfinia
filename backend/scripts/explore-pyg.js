/**
 * Script para explorar en detalle la sección de Pérdidas y Ganancias
 */

const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../../TAXFINMHO2024.xlsx');
const workbook = XLSX.readFile(excelPath);
const datosSheet = workbook.Sheets['DATOS'];

function getValue(cell) {
  if (!datosSheet[cell]) return null;
  const cellData = datosSheet[cell];
  return cellData.v !== undefined ? cellData.v : (cellData.w || null);
}

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('EXPLORANDO SECCIÓN DE PÉRDIDAS Y GANANCIAS EN DETALLE');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Explorar desde fila 40 hasta fila 70 para encontrar la estructura correcta
console.log('FILAS 40-75 - COLUMNAS A-K (años 2024-2020)\n');
console.log('Formato: Fila | Etiqueta (col A-F) | 2024 (G) | 2023 (H) | 2022 (I) | 2021 (J) | 2020 (K)\n');

for (let row = 40; row <= 75; row++) {
  // Buscar etiqueta en columnas A, B, C, D, E, F
  let label = '';
  for (let col of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const val = getValue(`${col}${row}`);
    if (val && typeof val === 'string' && val.trim().length > 0) {
      label = val;
      break;
    }
  }

  // Obtener valores de los años
  const val2024 = getValue(`G${row}`);
  const val2023 = getValue(`H${row}`);
  const val2022 = getValue(`I${row}`);
  const val2021 = getValue(`J${row}`);
  const val2020 = getValue(`K${row}`);

  // Mostrar solo si tiene etiqueta o valores significativos
  if (label || val2024 || val2023 || val2022) {
    console.log(`\n📍 Fila ${row}:`);
    console.log(`   Etiqueta: ${label || '(vacío)'}`);
    if (val2024 !== null && val2024 !== undefined) {
      console.log(`   G${row} (2024): ${val2024}`);
    }
    if (val2023 !== null && val2023 !== undefined) {
      console.log(`   H${row} (2023): ${val2023}`);
    }
    if (val2022 !== null && val2022 !== undefined) {
      console.log(`   I${row} (2022): ${val2022}`);
    }
  }
}

console.log('\n\n═══════════════════════════════════════════════════════════════════');
console.log('BUSCANDO ESPECÍFICAMENTE "INGRESOS" Y "VENTAS"');
console.log('═══════════════════════════════════════════════════════════════════\n');

for (let row = 40; row <= 120; row++) {
  let label = '';
  for (let col of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const val = getValue(`${col}${row}`);
    if (val && typeof val === 'string') {
      const valLower = val.toLowerCase();
      if (valLower.includes('ingreso') || valLower.includes('venta') || valLower.includes('cifra')) {
        label = val;
        const val2024 = getValue(`G${row}`);
        console.log(`\n✅ Fila ${row}: ${label}`);
        console.log(`   Valor 2024 (G${row}): ${val2024}`);
        break;
      }
    }
  }
}

console.log('\n\n═══════════════════════════════════════════════════════════════════');
console.log('ESTRUCTURA COMPLETA DE P&G - FILAS CLAVE');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Ver la estructura desde donde debería empezar P&G
const pygStart = 100; // Ajustar según lo que veamos
console.log('Explorando desde fila 100 (ajustar si es necesario):\n');

for (let row = 100; row <= 170; row++) {
  let label = '';
  for (let col of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const val = getValue(`${col}${row}`);
    if (val && typeof val === 'string' && val.trim().length > 2) {
      label = val;
      break;
    }
  }

  const val2024 = getValue(`G${row}`);

  if (label) {
    console.log(`\nFila ${row}: ${label}`);
    if (val2024 !== null && val2024 !== undefined) {
      console.log(`   Valor 2024: ${val2024}`);
    }
  }
}
