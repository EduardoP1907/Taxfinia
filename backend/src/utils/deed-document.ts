// Keep the extracted text bounded so it doesn't blow up the AI prompt —
// a company deed is normally a few pages; this is well past that.
const MAX_TEXT_LENGTH = 20000;

export const ALLOWED_DEED_MIME_TYPES = ['application/pdf', 'text/plain'];

/**
 * Extracts plain text from an uploaded deed document so it can be fed into
 * the AI report prompt as company context. Supports PDF (parsed) and plain
 * text (read as-is); any other mimetype is rejected before reaching here.
 *
 * `pdf-parse` (via pdfjs-dist) is imported lazily, on first use, instead of
 * at module load time: its legacy build references browser-only globals
 * (DOMMatrix, etc.) that older Node runtimes lack, and importing it eagerly
 * would crash the whole process at startup on such a runtime instead of
 * failing just this one request.
 */
export async function extractDeedDocumentText(buffer: Buffer, mimeType: string): Promise<string> {
  let text: string;

  if (mimeType === 'application/pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else {
    text = buffer.toString('utf-8');
  }

  return text.trim().slice(0, MAX_TEXT_LENGTH);
}
