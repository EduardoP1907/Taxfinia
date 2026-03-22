import api from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const chatService = {
  async sendMessage(companyId: string, message: string, history: ChatMessage[]): Promise<string> {
    const response = await api.post(`/chat/${companyId}`, { message, history });
    return response.data.response;
  },
};
