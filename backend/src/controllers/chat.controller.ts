import { Request, Response } from 'express';
import { chatWithCompany, type ChatMessage } from '../services/chat.service';
import { lockCompany } from '../services/company.service';

// Comentario SSE periódico mientras el modelo aún no emite texto, para que
// CloudFront (timeout de lectura del origen: 30 s) no corte la conexión.
const HEARTBEAT_MS = 10_000;

export class ChatController {
  /**
   * POST /api/chat/:companyId
   * Body: { message: string, history: ChatMessage[] }
   * Respuesta: text/event-stream con eventos
   *   data: {"text": "..."}          — fragmento de la respuesta
   *   event: done  data: {}          — fin correcto
   *   event: error data: {"error"}   — fallo tras iniciar el stream
   * Los errores de validación previos al stream siguen siendo JSON (4xx).
   */
  async chat(req: Request, res: Response): Promise<void> {
    const { companyId } = req.params;
    const { message, history = [] } = req.body as { message: string; history: ChatMessage[] };

    if (!message?.trim()) {
      res.status(400).json({ error: 'El mensaje no puede estar vacío' });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({ error: 'Mensaje demasiado largo (máximo 2000 caracteres)' });
      return;
    }

    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // por si hay un nginx delante
    });
    res.flushHeaders();

    const send = (data: unknown, event?: string) => {
      if (res.writableEnded) return;
      res.write(`${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`);
    };

    const heartbeat = setInterval(() => {
      if (!res.writableEnded) res.write(': ping\n\n');
    }, HEARTBEAT_MS);

    // Si el usuario cierra la página, cancelar la llamada al modelo
    const abort = new AbortController();
    res.on('close', () => {
      clearInterval(heartbeat);
      if (!res.writableEnded) abort.abort();
    });

    try {
      await chatWithCompany(
        companyId,
        message.trim(),
        history,
        text => send({ text }),
        abort.signal,
      );

      // Lock the company on first chat interaction
      lockCompany(companyId).catch(err =>
        console.error('[CHAT] Failed to lock company:', err.message)
      );

      send({}, 'done');
    } catch (error) {
      if (abort.signal.aborted) return;
      console.error('[CHAT] Error:', error);
      send({ error: 'Error al procesar la consulta. Inténtalo de nuevo.' }, 'error');
    } finally {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    }
  }
}

export const chatController = new ChatController();
