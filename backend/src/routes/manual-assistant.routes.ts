import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middlewares/auth.middleware';
import { askManual, type ManualChatMessage } from '../services/manual-assistant.service';

const router = Router();

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY = 12;

router.use(authMiddleware);

// Evita el uso del asistente como chat de propósito general a costa del sistema
router.use(rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req: Request) => req.user?.userId ?? req.ip ?? 'anon',
  message: { error: 'Has hecho muchas consultas seguidas al asistente. Espera unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

/**
 * POST /api/manual-assistant
 * Body: { message: string, history: ManualChatMessage[] }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body as { message?: unknown; history?: unknown };

    if (typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'El mensaje no puede estar vacío' });
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: `Mensaje demasiado largo (máximo ${MAX_MESSAGE_LENGTH} caracteres)` });
      return;
    }

    // Solo los últimos turnos válidos; el historial siempre empieza con el usuario
    const turns = (Array.isArray(history) ? history : [])
      .filter((m): m is ManualChatMessage =>
        (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim() !== '')
      .slice(-MAX_HISTORY)
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
    while (turns.length && turns[0].role !== 'user') turns.shift();

    const response = await askManual(message.trim(), turns);
    res.json({ response });
  } catch (error) {
    console.error('[MANUAL-ASSISTANT] Error:', error);
    res.status(500).json({ error: 'No se pudo responder la consulta. Intenta nuevamente en unos minutos.' });
  }
});

export default router;
