/**
 * docx-to-pdf.ts
 * Cross-platform DOCX → PDF conversion:
 *   - Windows (development): Microsoft Word via PowerShell COM automation
 *   - Linux/macOS (AWS production): LibreOffice headless
 */

import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// ─── Windows: Word COM via PowerShell ────────────────────────────────────────
async function convertWithWord(docxPath: string, pdfPath: string): Promise<void> {
  const script = `
    $ErrorActionPreference = 'Stop'
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    try {
      $doc = $word.Documents.Open('${docxPath.replace(/\//g, '\\\\')}')
      $doc.SaveAs([ref]'${pdfPath.replace(/\//g, '\\\\')}', [ref]17)
      $doc.Close($false)
    } finally {
      $word.Quit()
    }
  `.trim();

  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    script,
  ], { timeout: 60000 });
}

// ─── Linux/macOS: LibreOffice headless ───────────────────────────────────────

/** Find the LibreOffice binary — handles versioned names like libreoffice26.2 */
function findLibreOfficeBin(): string {
  const candidates = [
    'libreoffice',
    'libreoffice26.2',
    'libreoffice25.8',
    'libreoffice24.8',
    'libreoffice7.6',
    '/opt/libreoffice26.2/program/soffice',
    '/opt/libreoffice25.8/program/soffice',
    '/opt/libreoffice24.8/program/soffice',
    '/opt/libreoffice7.6/program/soffice',
    '/usr/bin/soffice',
  ];

  for (const bin of candidates) {
    try {
      require('child_process').execFileSync(bin, ['--version'], { stdio: 'ignore', timeout: 5000 });
      return bin;
    } catch {}
  }

  return 'libreoffice'; // fallback
}

const LIBRE_OFFICE_BIN = findLibreOfficeBin();

async function convertWithLibreOffice(docxPath: string, pdfPath: string): Promise<void> {
  const outDir = path.dirname(pdfPath);
  const docxAbsolute = path.resolve(docxPath);
  const pdfAbsolute = path.resolve(pdfPath);

  await execAsync(
    `"${LIBRE_OFFICE_BIN}" --headless --convert-to pdf --outdir "${outDir}" "${docxAbsolute}"`,
    { timeout: 120000 }
  );

  // LibreOffice names the output file after the input file (replaces .docx with .pdf)
  const autoNamed = path.join(outDir, path.basename(docxAbsolute).replace(/\.docx$/i, '.pdf'));

  if (autoNamed !== pdfAbsolute && fs.existsSync(autoNamed)) {
    fs.renameSync(autoNamed, pdfAbsolute);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function convertDocxToPdf(docxPath: string, pdfPath: string): Promise<void> {
  if (process.platform === 'win32') {
    await convertWithWord(docxPath, pdfPath);
  } else {
    await convertWithLibreOffice(docxPath, pdfPath);
  }
}
