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
async function convertWithLibreOffice(docxPath: string, pdfPath: string): Promise<void> {
  const outDir = path.dirname(pdfPath);
  const docxAbsolute = path.resolve(docxPath);
  const pdfAbsolute = path.resolve(pdfPath);

  // libreoffice outputs <filename>.pdf in the same dir as the docx by default,
  // so we redirect output to the desired directory.
  await execAsync(
    `libreoffice --headless --convert-to pdf --outdir "${outDir}" "${docxAbsolute}"`,
    { timeout: 60000 }
  );

  // LibreOffice names the output file after the input file (replaces .docx with .pdf)
  const autoNamed = path.join(outDir, path.basename(docxAbsolute).replace(/\.docx$/i, '.pdf'));

  // Rename to the exact path the caller expects (if different)
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
