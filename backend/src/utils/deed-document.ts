// Keep the extracted text bounded so it doesn't blow up the AI prompt —
// a company deed is normally a few pages; this is well past that.
export const MAX_DEED_TEXT_LENGTH = 20000;

export const ALLOWED_DEED_MIME_TYPES = ['application/pdf', 'text/plain'];

// Fewer meaningful characters than this means there's nothing useful for the
// AI: in a PDF, typically a scanned deed (page images, no text layer).
const MIN_TEXT_CHARS = 50;

/** Problem with the uploaded file itself — the API answers 400, not 500. */
export class DeedDocumentError extends Error {}

export function hasEnoughText(text: string): boolean {
  return text.replace(/\s+/g, '').length >= MIN_TEXT_CHARS;
}

export function normalizeDeedText(text: string): string {
  return text.trim().slice(0, MAX_DEED_TEXT_LENGTH);
}

/**
 * Returns the PDF's embedded text layer (empty for a scanned PDF, which then
 * goes through OCR in `deed-ocr.service.ts`).
 *
 * Parsed with `unpdf` (pure-JS pdf.js build). We used to use `pdf-parse` v2,
 * but its pdfjs-dist always loads the native `@napi-rs/canvas` module in Node:
 * on the EC2 server that module crashed the process (Bus error) and, without
 * it, uploads failed with "DOMMatrix is not defined". `unpdf` only touches
 * canvas when rendering images, never for text.
 */
export async function extractPdfTextLayer(buffer: Buffer): Promise<string> {
  const { extractText } = await import('unpdf');
  try {
    const result = await extractText(new Uint8Array(buffer), { mergePages: true });
    return result.text.trim();
  } catch (err) {
    console.error('Error extracting deed PDF text:', err);
    throw new DeedDocumentError('No se pudo leer el PDF. Verifique que el archivo no esté dañado ni protegido con contraseña.');
  }
}
