import { API_URL, handleApiErrorResponse } from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Error con la misma forma que los de axios, para que la UI lea `response.data.error`. */
interface ChatErrorData { error?: string; [key: string]: unknown }

class ChatError extends Error {
  response: { status: number; data: ChatErrorData };
  constructor(status: number, data: ChatErrorData) {
    super(data?.error || 'Error al conectar con el asistente');
    this.response = { status, data };
  }
}

export const chatService = {
  /**
   * Envía la consulta y recibe la respuesta en streaming (Server-Sent Events).
   * `onText` recibe el texto acumulado cada vez que llega un fragmento.
   * Se usa fetch y no axios porque axios no permite leer el cuerpo en streaming en el navegador.
   */
  async sendMessage(
    companyId: string,
    message: string,
    history: ChatMessage[],
    onText?: (fullText: string) => void,
  ): Promise<string> {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${API_URL}/chat/${companyId}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, history }),
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      handleApiErrorResponse(res.status, data);
      throw new ChatError(res.status, data);
    }

    // Compatibilidad con un backend que aún responde JSON ({ response }) sin streaming
    if (res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      onText?.(data.response);
      return data.response;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    let done = false;

    while (!done) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });

      // Los eventos SSE se separan por una línea en blanco
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        let event = 'message';
        let dataStr = '';
        for (const line of raw.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
          // las líneas que empiezan por ':' son heartbeats
        }
        if (!dataStr) continue;
        const data = JSON.parse(dataStr);

        if (event === 'error') throw new ChatError(500, data);
        if (event === 'done') { done = true; break; }
        if (typeof data.text === 'string') {
          full += data.text;
          onText?.(full);
        }
      }
    }

    if (!done) throw new ChatError(0, { error: 'La conexión con el asistente se interrumpió. Inténtalo de nuevo.' });
    return full;
  },
};
