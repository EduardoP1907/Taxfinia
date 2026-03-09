const XLSX = require('xlsx');
const fs = require('fs');

// Leer el archivo Excel
const workbook = XLSX.readFile('./TAXFINMHO2024.xlsx');

console.log('🔄 TRAZABILIDAD DE FÓRMULAS: DATOS → Análisis\n');
console.log('='.repeat(80));

// Función para extraer referencias de una fórmula
function extractReferences(formula) {
  if (!formula) return [];

  const refs = [];

  // Buscar referencias a otras hojas (formato: 'SheetName'!Cell o SheetName!Cell)
  const sheetRefPattern = /(?:'([^']+)'|([A-Za-z0-9]+))!(\$?[A-Z]+\$?[0-9]+)/g;
  let match;

  while ((match = sheetRefPattern.exec(formula)) !== null) {
    const sheetName = match[1] || match[2];
    const cellRef = match[3];
    refs.push({ sheet: sheetName, cell: cellRef });
  }

  // Buscar referencias en la misma hoja
  const cellRefPattern = /\$?[A-Z]+\$?[0-9]+/g;
  const cellMatches = formula.match(cellRefPattern) || [];
  cellMatches.forEach(cellRef => {
    if (!cellRef.includes('!')) {
      refs.push({ sheet: 'SAME', cell: cellRef });
    }
  });

  return refs;
}

// Función para obtener el valor de una celda
function getCellValue(sheetName, cellAddress) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return null;

  const cell = sheet[cellAddress];
  if (!cell) return null;

  return {
    value: cell.v,
    formula: cell.f || null,
    type: cell.t
  };
}

// Analizar flujo desde DATOS hacia otras hojas
console.log('\n📊 HOJA DATOS - Estructura de entrada:');
console.log('-'.repeat(80));

const datosSheet = workbook.Sheets['DATOS'];
const datosRange = XLSX.utils.decode_range(datosSheet['!ref']);

// Identificar celdas clave en DATOS
const datosClave = {};

// Años (Fila 9)
for (let col = 6; col <= 10; col++) { // G a K
  const cellAddr = XLSX.utils.encode_cell({ r: 8, c: col });
  const cell = datosSheet[cellAddr];
  if (cell && cell.f) {
    const colName = String.fromCharCode(65 + col);
    datosClave[`Año_${colName}`] = {
      cell: cellAddr,
      formula: cell.f,
      value: cell.v,
      description: 'Año del ejercicio'
    };
  }
}

// Balance - Activos (filas 10-24)
const balanceItems = [
  { row: 10, name: 'ACTIVO NO CORRIENTE' },
  { row: 11, name: 'Inmovilizado material' },
  { row: 12, name: 'Inmovilizado inmaterial' },
  { row: 13, name: 'Inversiones financieras LP' },
  { row: 14, name: 'Otro realizable LP' },
  { row: 15, name: 'ACTIVO CORRIENTE' },
  { row: 16, name: 'Existencias' },
  { row: 17, name: 'Realizable' },
  { row: 18, name: 'Clientes' },
  { row: 21, name: 'Disponible' },
  { row: 24, name: 'TOTAL ACTIVO' }
];

balanceItems.forEach(item => {
  const cellAddr = XLSX.utils.encode_cell({ r: item.row - 1, c: 6 }); // Columna G
  const cell = datosSheet[cellAddr];
  if (cell) {
    datosClave[item.name] = {
      cell: cellAddr,
      formula: cell.f || 'VALOR DIRECTO',
      value: cell.v,
      description: `Balance - ${item.name}`
    };
  }
});

// P&G items (filas 46-68)
const pgItems = [
  { row: 46, name: 'Ingresos por Ventas' },
  { row: 48, name: 'Coste de las ventas' },
  { row: 52, name: 'Gastos de explotación' },
  { row: 55, name: 'Amortizaciones' },
  { row: 58, name: 'Resultado excepcional' },
  { row: 62, name: 'Resultado financiero' },
  { row: 66, name: 'Impuestos' }
];

pgItems.forEach(item => {
  const cellAddr = XLSX.utils.encode_cell({ r: item.row - 1, c: 6 }); // Columna G
  const cell = datosSheet[cellAddr];
  if (cell) {
    datosClave[item.name] = {
      cell: cellAddr,
      formula: cell.f || 'VALOR DIRECTO',
      value: cell.v,
      description: `P&G - ${item.name}`
    };
  }
});

console.log('\n📍 Celdas clave identificadas en DATOS:');
Object.keys(datosClave).slice(0, 15).forEach(key => {
  const item = datosClave[key];
  console.log(`\n  ${key}:`);
  console.log(`    Celda: ${item.cell}`);
  console.log(`    Fórmula: ${item.formula}`);
  console.log(`    Valor: ${item.value}`);
});

// Ahora rastrear cómo se usan en hoja 2.1
console.log('\n\n📊 FLUJO: DATOS → 2.1 (Análisis de Resultados)');
console.log('='.repeat(80));

const sheet21 = workbook.Sheets['2.1'];
const range21 = XLSX.utils.decode_range(sheet21['!ref']);

// Buscar referencias a DATOS en hoja 2.1
const referencias21 = [];

for (let R = range21.s.r; R <= Math.min(range21.e.r, 100); ++R) {
  for (let C = range21.s.c; C <= Math.min(range21.e.c, 20); ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = sheet21[cellAddress];

    if (cell && cell.f) {
      const refs = extractReferences(cell.f);
      const datosRefs = refs.filter(ref => ref.sheet === 'DATOS');

      if (datosRefs.length > 0) {
        // Obtener nombre de la celda (columna E suele tener descripciones)
        const nameCell = sheet21[XLSX.utils.encode_cell({ r: R, c: 4 })];
        const nombre = nameCell && nameCell.v ? nameCell.v : 'Sin nombre';

        referencias21.push({
          cell: cellAddress,
          row: R + 1,
          nombre,
          formula: cell.f,
          value: cell.v,
          datosRefs
        });
      }
    }
  }
}

console.log(`\n🔗 Encontradas ${referencias21.length} referencias a DATOS en hoja 2.1\n`);
console.log('Primeras 20 referencias:');
referencias21.slice(0, 20).forEach(ref => {
  console.log(`\n  Fila ${ref.row} - ${ref.nombre}`);
  console.log(`    Celda: ${ref.cell}`);
  console.log(`    Fórmula: ${ref.formula}`);
  console.log(`    Valor: ${ref.value}`);
  console.log(`    Referencias a DATOS: ${ref.datosRefs.map(r => r.cell).join(', ')}`);
});

// Repetir para hoja 2.4 (Ratios)
console.log('\n\n📊 FLUJO: CalcBal/2.1/2.2 → 2.4 (Ratios Financieros)');
console.log('='.repeat(80));

const sheet24 = workbook.Sheets['2.4'];
const range24 = XLSX.utils.decode_range(sheet24['!ref']);

const referencias24 = {};

for (let R = range24.s.r; R <= Math.min(range24.e.r, 150); ++R) {
  const nameCell = sheet24[XLSX.utils.encode_cell({ r: R, c: 4 })]; // Columna E
  const formulaCell = sheet24[XLSX.utils.encode_cell({ r: R, c: 7 })]; // Columna H (2024)

  if (nameCell && nameCell.v && formulaCell && formulaCell.f) {
    const nombre = String(nameCell.v).trim();

    if (nombre.length > 3 && nombre.length < 100) {
      const refs = extractReferences(formulaCell.f);

      referencias24[nombre] = {
        row: R + 1,
        cell: XLSX.utils.encode_cell({ r: R, c: 7 }),
        formula: formulaCell.f,
        value: formulaCell.v,
        references: refs
      };
    }
  }
}

console.log(`\n🔗 Encontrados ${Object.keys(referencias24).length} ratios en hoja 2.4\n`);
console.log('Ratios más importantes:\n');

// Filtrar ratios importantes
const importantRatios = [
  'Capitalización',
  'Ratio de autonomía',
  'Ratio de Liquidez',
  'Liquidez inmediata',
  'Disponibilidad',
  'Ratio de endeudamiento',
  'Endeudamiento sobre EBITDA',
  'Rotación de existencias',
  'Plazo medio de cobro',
  'Plazo medio de pago'
];

Object.keys(referencias24).forEach(nombre => {
  if (importantRatios.some(r => nombre.toLowerCase().includes(r.toLowerCase()))) {
    const ratio = referencias24[nombre];
    console.log(`\n🔹 ${nombre} (Fila ${ratio.row})`);
    console.log(`  Celda: ${ratio.cell}`);
    console.log(`  Fórmula: ${ratio.formula}`);
    console.log(`  Valor: ${ratio.value}`);
    console.log(`  Referencias:`);
    ratio.references.forEach(ref => {
      console.log(`    → ${ref.sheet}!${ref.cell}`);
    });
  }
});

// Crear mapa de flujo de datos
console.log('\n\n📈 MAPA DE FLUJO DE DATOS:');
console.log('='.repeat(80));

const flujoMapa = {
  'DATOS': {
    descripcion: 'Entrada de datos financieros (Balance, P&G, Flujos)',
    flujos: []
  },
  'CalcBal': {
    descripcion: 'Cálculos auxiliares de balance',
    input: ['DATOS'],
    flujos: []
  },
  '2.1': {
    descripcion: 'Análisis de Resultados (P&G)',
    input: ['DATOS'],
    flujos: referencias21.slice(0, 10)
  },
  '2.2': {
    descripcion: 'Análisis de Balances',
    input: ['DATOS', 'CalcBal'],
    flujos: []
  },
  '2.4': {
    descripcion: 'Ratios Financieros',
    input: ['CalcBal', '2.1', '2.2'],
    flujos: Object.entries(referencias24).slice(0, 10).map(([nombre, data]) => ({
      nombre,
      ...data
    }))
  }
};

console.log('\n📋 Resumen del flujo:\n');
console.log('  DATOS (Input manual)');
console.log('    ↓');
console.log('    ├→ 2.1 (Análisis P&G: EBITDA, EBIT, Márgenes)');
console.log('    ├→ 2.2 (Análisis Balance: Estructura, FM)');
console.log('    └→ CalcBal (Cálculos auxiliares)');
console.log('          ↓');
console.log('          ├→ 2.4 (Ratios Financieros)');
console.log('          └→ 2.5 (Análisis de Riesgo)');

// Guardar análisis completo
fs.writeFileSync(
  './flujo-formulas.json',
  JSON.stringify({ datosClave, referencias21: referencias21.slice(0, 50), referencias24, flujoMapa }, null, 2),
  'utf8'
);

console.log('\n\n✅ Análisis de flujo completado');
console.log('📄 Datos guardados en: flujo-formulas.json');
console.log('\n');
