import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, X, RotateCcw } from 'lucide-react';
import { manualAssistantService } from '../../services/manual-assistant.service';
import type { ChatMessage } from '../../services/chat.service';

const MAX_LENGTH = 1000;

const SUGGESTIONS = [
  '¿Cómo cargo los estados financieros?',
  '¿Por qué no puedo editar un año?',
  '¿Cómo descargo el informe en PDF?',
  '¿Qué es el WACC y dónde lo ingreso?',
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pregunta para enviar al abrir (p. ej. desde una búsqueda sin resultados) */
  initialQuestion?: string;
  /** Pinta el texto con las marcas del manual («botón» y [[6.2]]) */
  renderText: (text: string) => React.ReactNode;
}

export const ManualAssistant: React.FC<Props> = ({ open, onClose, initialQuestion, renderText }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    const history = messages;
    setMessages([...history, { role: 'user', content: question }]);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const answer = await manualAssistantService.ask(question, history);
      setMessages(m => [...m, { role: 'assistant', content: answer }]);
    } catch (e) {
      // Se quita la pregunta sin respuesta para que el historial siga alternando
      setMessages(history);
      setInput(question);
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'No se pudo responder la consulta. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && initialQuestion) send(initialQuestion);
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuestion]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <section
      role="dialog"
      aria-label="Asistente del manual"
      className="fixed z-40 inset-x-4 bottom-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem] h-[min(36rem,calc(100vh-2rem))] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
    >
      <header className="flex items-center gap-3 px-4 py-3 bg-slate-900 text-white">
        <span className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">Asistente del manual</h2>
          <p className="text-[11px] text-slate-400">Responde solo con el contenido del Manual de Usuario</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => { setMessages([]); setError(null); }}
            disabled={loading}
            aria-label="Nueva conversación"
            title="Nueva conversación"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar asistente"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50" aria-live="polite">
        {messages.length === 0 && !loading && (
          <div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pregunte cómo hacer algo en PROMETHEIA. La respuesta indica la sección del manual donde se explica.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-left px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:border-amber-300 hover:text-slate-900"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => m.role === 'user' ? (
          <div key={i} className="flex justify-end">
            <p className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md bg-slate-900 text-white text-sm whitespace-pre-wrap break-words">
              {m.content}
            </p>
          </div>
        ) : (
          <div key={i} className="max-w-[92%] px-3 py-2.5 rounded-2xl rounded-bl-md bg-white border border-slate-200 text-sm text-slate-700 leading-relaxed space-y-1.5">
            {m.content.split(/\n+/).map((line, li) => <p key={li}>{renderText(line)}</p>)}
          </div>
        ))}

        {loading && (
          <div className="inline-flex items-center gap-1 px-3 py-3 rounded-2xl rounded-bl-md bg-white border border-slate-200" aria-label="El asistente está respondiendo">
            {[0, 150, 300].map(d => (
              <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400 motion-safe:animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}

        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>

      <form
        onSubmit={e => { e.preventDefault(); send(input); }}
        className="flex items-end gap-2 p-3 border-t border-slate-200 bg-white"
      >
        <label htmlFor="manual-assistant-input" className="sr-only">Escriba su pregunta sobre el manual</label>
        <textarea
          id="manual-assistant-input"
          ref={inputRef}
          rows={1}
          value={input}
          maxLength={MAX_LENGTH}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
          }}
          placeholder="Escriba su pregunta…"
          className="flex-1 resize-none max-h-28 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Enviar pregunta"
          className="w-9 h-9 flex-shrink-0 rounded-xl bg-amber-500 text-slate-900 flex items-center justify-center hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
};
