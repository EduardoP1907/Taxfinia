import api from './api';
import type { ChatMessage } from './chat.service';

export const manualAssistantService = {
  async ask(message: string, history: ChatMessage[]): Promise<string> {
    const response = await api.post('/manual-assistant', { message, history });
    return response.data.response;
  },
};
