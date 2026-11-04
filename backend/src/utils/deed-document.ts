// Keep the extracted text bounded so it doesn't blow up the AI prompt —
// a company deed is normally a few pages; this is well past that.
const MAX_TEXT_LENGTH = 20000;

export const ALLOWED_DEED_MIME_TYPES = ['application/pdf', 'text/plain'];

// Fewer meaningful characters than this means there's nothing useful for the
// AI: typically a scanned deed (page images, no text layer).
const MIN_TEXT_CHARS = 50;

/** Problem with the uploaded file itself — the API answers 400, not 500. */
export class DeedDocumentError extends Error {}

/**
 * Extracts plain text from an uploaded deed document so it can be fed into
 * the AI report prompt as company context. Supports PDF (parsed) and plain
 * text (read as-is); any other mimetype is rejected before reaching here.
 *
 * PDFs are parsed with `unpdf` (pure-JS pdf.js build). We used to use
 * `pdf-parse` v2, but its pdfjs-dist always loads the native `@napi-rs/canvas`
 * module in Node: on the EC2 server that module crashed the process (Bus
 * error) and, without it, uploads failed with "DOMMatrix is not defined".
 * `unpdf` only touches canvas when rendering images, never for text.
 */
export async function extractDeedDocumentText(buffer: Buffer, mimeType: string): Promise<string> {
  let text: string;

  if (mimeType === 'application/pdf') {
    const { extractText } = await import('unpdf');
    try {
      const result = await extractText(new Uint8Array(buffer), { mergePages: true });
      text = result.text;
    } catch (err) {
      console.error('Error extracting deed PDF text:', err);
      throw new DeedDocumentError('No se pudo leer el PDF. Verifique que el archivo no esté dañado ni protegido con contraseña.');
    }
  } else {
    text = buffer.toString('utf-8');
  }

  text = text.trim();
  if (text.replace(/\s+/g, '').length < MIN_TEXT_CHARS) {
    throw new DeedDocumentError(
      mimeType === 'application/pdf'
        ? 'El PDF parece escaneado: no contiene texto que se pueda leer. Suba una versión con texto seleccionable o un archivo .txt con el contenido de la escritura.'
        : 'El archivo de texto está vacío o no tiene contenido suficiente.',
    );
  }

  return text.slice(0, MAX_TEXT_LENGTH);
}
