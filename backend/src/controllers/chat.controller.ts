import { Request, Response } from 'express';
import { chatWithCompany, type ChatMessage } from '../services/chat.service';
import { lockCompany } from '../services/company.service';

export class ChatController {
  /**
   * POST /api/chat/:companyId
   * Body: { message: string, history: ChatMessage[] }
   */
  async chat(req: Request, res: Response): Promise<void> {
    try {
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

      const response = await chatWithCompany(companyId, message.trim(), history);

      // Lock the company on first chat interaction
      lockCompany(companyId).catch(err =>
        console.error('[CHAT] Failed to lock company:', err.message)
      );

      res.json({ response });
    } catch (error) {
      console.error('[CHAT] Error:', error);
      const message = error instanceof Error ? error.message : 'Error al procesar la consulta';
      res.status(500).json({ error: message });
    }
  }
}

export const chatController = new ChatController();
