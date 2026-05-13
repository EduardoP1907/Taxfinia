import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Bot, User, Loader2, ChevronDown, ChevronUp, Lock, KeyRound, Sparkles, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

// ── Markdown renderer for assistant messages ─────────────────────────────────
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      h1: ({ children }) => (
        <h1 className="text-base font-bold text-slate-900 mt-4 mb-2 first:mt-0 pb-1 border-b border-slate-100">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-sm font-bold text-slate-800 mt-4 mb-2 first:mt-0">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-sm font-semibold text-slate-700 mt-3 mb-1.5 first:mt-0">{children}</h3>
      ),
      p: ({ children }) => (
        <p className="text-sm text-slate-700 leading-relaxed mb-3 last:mb-0">{children}</p>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-slate-900">{children}</strong>
      ),
      em: ({ children }) => (
        <em className="italic text-slate-600">{children}</em>
      ),
      ul: ({ children }) => (
        <ul className="mb-3 space-y-1 last:mb-0">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-3 space-y-1 list-decimal pl-4 last:mb-0">{children}</ol>
      ),
      li: ({ children }) => (
        <li className="text-sm text-slate-700 leading-relaxed flex gap-2 items-start">
          <span className="mt-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
          <span>{children}</span>
        </li>
      ),
      table: ({ children }) => (
        <div className="overflow-x-auto mb-3 last:mb-0 rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-xs border-collapse">{children}</table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className="bg-slate-900 text-white">{children}</thead>
      ),
      tbody: ({ children }) => (
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      ),
      tr: ({ children }) => (
        <tr className="even:bg-slate-50 hover:bg-amber-50/40 transition-colors">{children}</tr>
      ),
      th: ({ children }) => (
        <th className="px-3 py-2 text-left font-semibold text-[11px] tracking-wide uppercase text-slate-300 whitespace-nowrap">{children}</th>
      ),
      td: ({ children }) => (
        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{children}</td>
      ),
      hr: () => (
        <hr className="my-4 border-slate-200" />
      ),
      blockquote: ({ children }) => (
        <blockquote className="border-l-3 border-amber-400 pl-3 my-3 text-sm text-slate-600 italic bg-amber-50/50 py-2 rounded-r-lg">{children}</blockquote>
      ),
      code: ({ children, className }) => {
        const isBlock = className?.includes('language-');
        return isBlock ? (
          <pre className="bg-slate-900 text-slate-200 rounded-xl px-4 py-3 text-xs overflow-x-auto mb-3 last:mb-0 font-mono leading-relaxed">
            <code>{children}</code>
          </pre>
        ) : (
          <code className="bg-slate-100 text-amber-700 px-1.5 py-0.5 rounded-md text-xs font-mono">{children}</code>
        );
      },
    }}
  >
    {content}
  </ReactMarkdown>
);

// ─────────────────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY(companyId), JSON.stringify(history));
  }, [history, companyId]);

  useEffect(() => {
    if (open && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [history, loading, open]);

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
      setHistory(prev => prev.slice(0, -1));
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
    <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
      {/* ── Header ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-amber-400" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              Asistente Financiero IA
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </p>
            <p className="text-xs text-slate-400">Consultas sobre {companyName}</p>
          </div>
          {history.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 tracking-wide">
              {history.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && open && (
            <span
              onClick={e => { e.stopPropagation(); clearHistory(); }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/10 transition-colors"
              title="Limpiar conversación"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </span>
          )}
          {open
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* ── Locked state ── */}
      {open && isLocked && (
        <div className="bg-gradient-to-b from-slate-50 to-white px-6 py-12 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Lock className="w-7 h-7 text-slate-400" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-800 mb-1">Asistente bloqueado</p>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Para acceder al asistente financiero IA de <span className="font-medium text-slate-700">{companyName}</span> necesitas el código de acceso.
            </p>
          </div>
          <button
            onClick={onUnlock}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors shadow-sm"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            Ingresar código
          </button>
        </div>
      )}

      {/* ── Chat body ── */}
      {open && !isLocked && (
        <div className="flex flex-col" style={{ height: '560px' }}>

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-5 pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-lg">
                  <Bot className="w-8 h-8 text-amber-400" />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-slate-800 mb-1">Analista Financiero IA</p>
                  <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                    Tengo acceso completo a todos los datos de <span className="font-semibold text-slate-700">{companyName}</span>. Puedo ayudarte con ratios, tendencias, riesgos y valoración.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      className="text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 hover:shadow-sm transition-all duration-150 text-left shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4 text-amber-400" />
                  </div>
                )}

                {msg.role === 'user' ? (
                  // User bubble — plain text, dark bg
                  <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  // Assistant bubble — full-width, markdown rendered
                  <div className="flex-1 min-w-0 bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <MarkdownContent content={msg.content} />
                  </div>
                )}

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 text-amber-400" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center shadow-sm">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100">
            <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre los datos financieros…"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none max-h-28"
                style={{ minHeight: '36px' }}
                disabled={loading}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="p-2 bg-slate-900 text-white rounded-lg hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 flex-shrink-0"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  title="Limpiar conversación"
                  className="p-2 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 pl-1">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
