// Keep the extracted text bounded so it doesn't blow up the AI prompt —
// a company deed is normally a few pages; this is well past that.
const MAX_TEXT_LENGTH = 20000;

export const ALLOWED_DEED_MIME_TYPES = ['application/pdf', 'text/plain'];

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
      throw new Error('No se pudo leer el PDF. Verifique que el archivo no esté dañado ni protegido con contraseña.');
    }
  } else {
    text = buffer.toString('utf-8');
  }

  return text.trim().slice(0, MAX_TEXT_LENGTH);
}
