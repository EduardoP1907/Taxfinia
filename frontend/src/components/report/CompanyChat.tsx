import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Trash2, Bot, User, Loader2, ChevronDown, ChevronUp, Lock, KeyRound } from 'lucide-react';
import { chatService, type ChatMessage } from '../../services/chat.service';

interface Props {
  companyId: string;
  companyName: string;
  isLocked?: boolean;
  onUnlock?: () => void;
}

const STORAGE_KEY = (id: string) => `chat_history_${id}`;

const SUGGESTIONS = [
  '¿Cuál es la tendencia de los ingresos en los últimos años?',
  '¿Cómo está la liquidez de la empresa?',
  '¿Cuáles son los principales riesgos financieros?',
  '¿Qué dice el Z-Score sobre el riesgo de insolvencia?',
  '¿Cuál es el valor estimado de la empresa según el DCF?',
  '¿Cómo ha evolucionado el margen EBITDA?',
];

export const CompanyChat: React.FC<Props> = ({ companyId, companyName, isLocked = false, onUnlock }) => {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY(companyId));
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persist history to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY(companyId), JSON.stringify(history));
  }, [history, companyId]);

  // Scroll to bottom on new message — scroll the container directly to avoid mover la página
  useEffect(() => {
    if (open && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [history, loading, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;

    setInput('');
    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: msg };
    setHistory(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await chatService.sendMessage(companyId, msg, history);
      setHistory(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al conectar con el asistente. Inténtalo de nuevo.');
      setHistory(prev => prev.slice(0, -1)); // remove optimistic user message
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY(companyId));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header — toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg">
            <MessageCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900">Asistente Financiero IA</p>
            <p className="text-xs text-slate-500">Consultas sobre {companyName}</p>
          </div>
          {history.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
              {history.length} mensajes
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && isLocked && (
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-10 flex flex-col items-center gap-4 text-center">
          <div className="p-3 bg-slate-900 rounded-xl">
            <Lock className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-1">Asistente bloqueado</p>
            <p className="text-xs text-slate-500 max-w-xs">
              Para acceder al asistente financiero IA de {companyName} necesitas el código de acceso.
            </p>
          </div>
          <button
            onClick={onUnlock}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            Ingresar código
          </button>
        </div>
      )}

      {open && !isLocked && (
        <div className="border-t border-slate-200">
          {/* Messages area */}
          <div ref={messagesContainerRef} className="h-96 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="p-3 bg-slate-900 rounded-xl">
                  <Bot className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700 mb-1">Hola, soy tu analista financiero IA</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Tengo acceso completo a todos los datos de {companyName}. Puedes preguntarme lo que quieras sobre sus finanzas.
                  </p>
                </div>
                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-colors text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                {error}
              </div>
            )}

          </div>

          {/* Input area */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre los datos financieros…"
                rows={1}
                className="flex-1 resize-none border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent max-h-32"
                style={{ minHeight: '42px' }}
                disabled={loading}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  title="Limpiar conversación"
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1.5 pl-1">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
