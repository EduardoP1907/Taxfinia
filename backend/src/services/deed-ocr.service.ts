import Anthropic, { toFile } from '@anthropic-ai/sdk';

/**
 * OCR de escrituras escaneadas (PDF con páginas como imagen, sin capa de texto).
 *
 * Claude lee el PDF directamente (cada página como imagen) y devuelve el
 * contenido relevante en texto plano, que luego se guarda en
 * `Company.deedDocumentText` y alimenta los informes IA igual que un PDF con texto.
 *
 * El PDF se sube con la Files API en lugar de ir en base64 dentro del mensaje:
 * una escritura escaneada pesa fácilmente 40 MB y una solicitud a Messages
 * admite como máximo 32 MB. El archivo se borra de Anthropic al terminar.
 */

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-opus-5-5';
const FILES_BETA = 'files-api-2025-04-14';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

const SYSTEM_PROMPT = `Eres un asistente que transcribe escrituras públicas escaneadas de empresas chilenas para que otro sistema de IA las use como contexto al redactar informes económico-financieros.

Lee todas las páginas del documento y escribe, en español y en texto plano (sin Markdown ni tablas), el contenido relevante para conocer la empresa:
- Datos de la escritura: notaría, notario, ciudad, fecha, repertorio, inscripción en el Registro de Comercio y publicación en el Diario Oficial.
- Razón social, nombre de fantasía, RUT, tipo de sociedad y domicilio.
- Objeto o giro social.
- Capital social: monto, cómo se suscribe y paga, y su distribución entre socios o accionistas (porcentajes o número de acciones).
- Socios o accionistas, con RUT cuando aparezca.
- Administración y representación legal, con las facultades y sus limitaciones.
- Duración de la sociedad, reparto de utilidades, disolución y liquidación.
- Modificaciones, cesiones de derechos, aumentos de capital u otras cláusulas especiales.

Copia nombres, RUT, montos, porcentajes y fechas exactamente como aparecen. No inventes ni completes datos: si un fragmento no se puede leer, escribe [ilegible]. Omite fórmulas notariales repetitivas, firmas, timbres y textos de certificación que no aporten información sobre la empresa. Responde solo con la transcripción, sin comentarios previos ni finales, en no más de 15.000 caracteres.`;

export async function ocrDeedDocument(buffer: Buffer, filename: string): Promise<string> {
  const uploaded = await client.beta.files.upload({
    file: await toFile(buffer, filename || 'escritura.pdf', { type: 'application/pdf' }),
    betas: [FILES_BETA],
  });

  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      betas: [FILES_BETA, FALLBACK_BETA],
      // Si Opus 5.5 rechazara la solicitud, la API la reintenta en otro modelo.
      // El SDK instalado (0.78) aún no tipa `fallbacks`, por eso va como spread.
      ...({ fallbacks: 'default' } as Record<string, unknown>),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'file', file_id: uploaded.id }, title: filename },
            { type: 'text', text: 'Transcribe el contenido relevante de esta escritura según las instrucciones.' },
          ],
        },
      ],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      throw new Error('La IA no pudo procesar el documento de escritura.');
    }

    const text = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    if (message.stop_reason === 'max_tokens') {
      console.warn(`[deed-ocr] Transcripción cortada por max_tokens (${text.length} caracteres)`);
    }
    console.log(
      `[deed-ocr] ${filename}: ${text.length} caracteres, ` +
        `${message.usage.input_tokens} tokens de entrada, ${message.usage.output_tokens} de salida`,
    );
    return text;
  } finally {
    client.beta.files.delete(uploaded.id, { betas: [FILES_BETA] }).catch((err) => {
      console.error('[deed-ocr] No se pudo borrar el archivo de Anthropic:', err?.message);
    });
  }
}
