/**
 * Copia el contenido del manual de usuario del frontend al backend, para que el
 * asistente IA del manual responda con el mismo texto que ve el usuario.
 * Fuente única: frontend/src/pages/manual/manualContent.ts
 */
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../../frontend/src/pages/manual/manualContent.ts');
const dest = path.resolve(__dirname, '../src/data/manualContent.ts');

if (!fs.existsSync(src)) {
  console.log('[sync-manual] No se encontró el manual del frontend; se usa la copia existente.');
  process.exit(0);
}

const header = '// ARCHIVO GENERADO por scripts/sync-manual.js — no editar aquí.\n// Editar frontend/src/pages/manual/manualContent.ts y ejecutar `npm run sync:manual`.\n\n';
fs.writeFileSync(dest, header + fs.readFileSync(src, 'utf8'));
console.log('[sync-manual] Manual copiado a src/data/manualContent.ts');
