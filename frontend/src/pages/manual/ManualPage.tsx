import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Download, Search, X, ChevronRight, ArrowRight, Lightbulb, AlertTriangle,
  Building2, FileText, FileBarChart, TrendingUp, Bot, LifeBuoy, ArrowUp, HelpCircle, BookA, Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useCompanyStore } from '../../store/companyStore';
import { ManualAssistant } from './ManualAssistant';
import {
  buildManual, sectionId, MANUAL_PDF_URL, MANUAL_PDF_FILENAME,
  type ManualBlock, type ManualSection,
} from './manualContent';

const FAQ_ID = 's-faq';
const GLOSSARY_ID = 's-glosario';

// ─── Búsqueda sin tildes ni mayúsculas ───────────────────────────────────────

/** Normaliza carácter a carácter para que los índices coincidan con el texto original. */
const normalize = (s: string) =>
  Array.from(s, ch => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()[0] ?? ch).join('');

const blockText = (b: ManualBlock): string => {
  switch (b.type) {
    case 'steps':
    case 'list': return b.items.join(' ');
    case 'table': return [...b.head, ...b.rows.flat()].join(' ');
    default: return b.text;
  }
};

const matches = (q: string, ...texts: string[]) => texts.some(t => normalize(t).includes(q));

// ─── Texto con marcas: «botón» y [[6.2]] ─────────────────────────────────────

const Highlight: React.FC<{ text: string; q: string }> = ({ text, q }) => {
  if (!q) return <>{text}</>;
  const norm = normalize(text);
  const parts: React.ReactNode[] = [];
  let from = 0;
  let idx = norm.indexOf(q);
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(<mark key={idx} className="bg-amber-200/70 text-inherit rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>);
    from = idx + q.length;
    idx = norm.indexOf(q, from);
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
};

const RichText: React.FC<{ text: string; q: string; onGoTo: (id: string) => void }> = ({ text, q, onGoTo }) => {
  const tokens = text.split(/(«[^»]+»|\[\[[\d.]+\]\])/g);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.startsWith('«')) {
          return (
            <span key={i} className="font-semibold text-slate-900">
              «<Highlight text={t.slice(1, -1)} q={q} />»
            </span>
          );
        }
        if (t.startsWith('[[')) {
          const num = t.slice(2, -2);
          const id = sectionId(num);
          return (
            <a
              key={i}
              href={`#${id}`}
              onClick={e => { e.preventDefault(); onGoTo(id); }}
              className="whitespace-nowrap text-amber-700 hover:text-amber-900 underline decoration-amber-300 underline-offset-2"
            >
              (ver sección {num})
            </a>
          );
        }
        return <Highlight key={i} text={t} q={q} />;
      })}
    </>
  );
};

const Block: React.FC<{ block: ManualBlock; q: string; onGoTo: (id: string) => void }> = ({ block, q, onGoTo }) => {
  const rt = (text: string) => <RichText text={text} q={q} onGoTo={onGoTo} />;
  switch (block.type) {
    case 'p':
      return <p className="text-sm text-slate-600 leading-relaxed">{rt(block.text)}</p>;
    case 'steps':
      return (
        <ol className="space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center tabular-nums mt-px">
                {i + 1}
              </span>
              <span>{rt(item)}</span>
            </li>
          ))}
        </ol>
      );
    case 'list':
      return (
        <ul className="space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-600 leading-relaxed">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" aria-hidden="true" />
              <span>{rt(item)}</span>
            </li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {block.head.map(h => (
                  <th key={h} scope="col" className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {block.rows.map((row, ri) => (
                <tr key={ri} className="align-top">
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-3 py-2 ${ci === 0 ? 'font-medium text-slate-800 min-w-[9rem]' : 'text-slate-600'}`}>{rt(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'tip':
      return (
        <div className="flex gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
          <p>{rt(block.text)}</p>
        </div>
      );
    case 'warning':
      return (
        <div className="flex gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
          <p>{rt(block.text)}</p>
        </div>
      );
  }
};

// ─── Página ──────────────────────────────────────────────────────────────────

/** Accesos rápidos: "¿Qué necesita hacer?" → sección del manual */
const QUICK_LINKS = [
  { label: 'Crear mi empresa', target: '4.1', icon: Building2 },
  { label: 'Cargar los estados financieros', target: '5', icon: FileText },
  { label: 'Generar el informe con IA', target: '11.2', icon: FileBarChart },
  { label: 'Proyectar y valorar (DCF)', target: '9', icon: TrendingUp },
  { label: 'Usar el Asistente IA', target: '13.2', icon: Bot },
  { label: 'Entender un mensaje de error', target: '14.1', icon: LifeBuoy },
];

export const ManualPage: React.FC = () => {
  const activeCompanyId = useCompanyStore(s => s.activeCompanyId);
  const { sections, faq, glossary } = useMemo(() => buildManual(new Date().getFullYear()), []);

  const [query, setQuery] = useState('');
  const q = normalize(query.trim());
  const [activeId, setActiveId] = useState<string>(sections[0].id);
  const [showTop, setShowTop] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState<string>();

  const openAssistant = (question?: string) => { setAssistantQuestion(question); setAssistantOpen(true); };
  const closeAssistant = () => { setAssistantOpen(false); setAssistantQuestion(undefined); };

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const goTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
    setActiveId(id);
  };

  // Al abrir /manual#s-5-6 ir directo a esa sección
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, []);

  // ── Filtro de búsqueda ─────────────────────────────────────────────────────
  const visibleSections = useMemo<ManualSection[]>(() => {
    if (!q) return sections;
    return sections.flatMap(s => {
      const own = matches(q, s.title, s.summary, ...(s.blocks ?? []).map(blockText));
      const subs = s.subsections.filter(sub => matches(q, sub.title, ...sub.blocks.map(blockText)));
      if (!own && subs.length === 0) return [];
      return [{ ...s, subsections: own && subs.length === 0 ? s.subsections : subs }];
    });
  }, [q, sections]);

  const visibleFaq = useMemo(() => q ? faq.filter(f => matches(q, f.q, f.a)) : faq, [q, faq]);
  const visibleGlossary = useMemo(() => q ? glossary.filter(g => matches(q, g.term, g.definition)) : glossary, [q, glossary]);
  const resultCount = visibleSections.reduce((n, s) => n + Math.max(1, s.subsections.length), 0) + visibleFaq.length + visibleGlossary.length;

  // ── Sección actual (índice resaltado) ─────────────────────────────────────
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setShowTop(window.scrollY > 600);
        const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-spy]'));
        let current = targets[0]?.id;
        for (const t of targets) {
          if (t.getBoundingClientRect().top < 140) current = t.id; else break;
        }
        if (current) setActiveId(current);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [visibleSections, visibleFaq, visibleGlossary]);

  // Sección principal a la que pertenece el elemento activo (para desplegar sus subsecciones)
  const activeSectionId = activeId.match(/^s-\d+/)?.[0] ?? activeId;

  const appLink = (s: ManualSection) =>
    s.link && (s.link.scoped && activeCompanyId ? `${s.link.to}?companyId=${activeCompanyId}` : s.link.to);

  const toc = (
    <nav aria-label="Índice del manual">
      <ol className="space-y-0.5">
        {visibleSections.map(s => {
          const open = !!q || s.id === activeSectionId;
          const isActive = s.id === activeSectionId;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={e => { e.preventDefault(); goTo(s.id); }}
                aria-current={isActive ? 'location' : undefined}
                className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-amber-50 text-amber-800 font-medium' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <span className="font-data text-xs text-slate-400 w-5 flex-shrink-0 mt-0.5 tabular-nums">{s.number}</span>
                <span className="flex-1">{s.title}</span>
              </a>
              {open && s.subsections.length > 0 && (
                <ol className="ml-7 mt-0.5 mb-1 border-l border-slate-200">
                  {s.subsections.map(sub => (
                    <li key={sub.id}>
                      <a
                        href={`#${sub.id}`}
                        onClick={e => { e.preventDefault(); goTo(sub.id); }}
                        aria-current={activeId === sub.id ? 'location' : undefined}
                        className={`block pl-3 pr-2 py-1 -ml-px border-l text-xs transition-colors ${activeId === sub.id ? 'border-amber-500 text-amber-800 font-medium' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                      >
                        {sub.number} {sub.title}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
        {visibleFaq.length > 0 && (
          <li>
            <a
              href={`#${FAQ_ID}`}
              onClick={e => { e.preventDefault(); goTo(FAQ_ID); }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm ${activeId === FAQ_ID ? 'bg-amber-50 text-amber-800 font-medium' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" /> Preguntas frecuentes
            </a>
          </li>
        )}
        {visibleGlossary.length > 0 && (
          <li>
            <a
              href={`#${GLOSSARY_ID}`}
              onClick={e => { e.preventDefault(); goTo(GLOSSARY_ID); }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm ${activeId === GLOSSARY_ID ? 'bg-amber-50 text-amber-800 font-medium' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <BookA className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" /> Glosario
            </a>
          </li>
        )}
      </ol>
    </nav>
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">

        {/* ── Encabezado ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-data text-[10px] text-slate-400 tracking-[0.2em] uppercase">/ Ayuda</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-slate-900 leading-tight flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-amber-500" aria-hidden="true" />
              Manual de Usuario
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Busque un tema o navegue por el índice. Cada sección tiene un acceso directo a la página que explica.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openAssistant()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-900 text-sm font-semibold hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Preguntar al asistente
            </button>
            <a
              href={MANUAL_PDF_URL}
              download={MANUAL_PDF_FILENAME}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Descargar manual (PDF)
            </a>
          </div>
        </div>

        {/* ── Búsqueda ─────────────────────────────────────────────────────── */}
        <div className="relative mb-6">
          <label htmlFor="manual-search" className="sr-only">Buscar en el manual</label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            id="manual-search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="¿Qué necesita saber? Ej.: RUT, consolidación, WACC, guardar, informe…"
            className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {q && (
          <p role="status" className="-mt-3 mb-5 text-xs text-slate-500">
            {resultCount === 0 ? 'Sin resultados.' : `${resultCount} resultado${resultCount > 1 ? 's' : ''} para «${query.trim()}».`}
          </p>
        )}

        {/* ── ¿Qué necesita hacer? ─────────────────────────────────────────── */}
        {!q && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">¿Qué necesita hacer?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {QUICK_LINKS.map(l => (
                <button
                  key={l.target}
                  type="button"
                  onClick={() => goTo(sectionId(l.target))}
                  className="group flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-amber-300 hover:shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <span className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <l.icon className="w-4 h-4 text-amber-600" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-800">{l.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">

          {/* ── Índice: lateral fijo en escritorio, desplegable en móvil ──── */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto pr-1 pb-4">
              <p className="px-2.5 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Índice</p>
              {toc}
            </div>
          </aside>
          <details className="lg:hidden mb-6 bg-white border border-slate-200 rounded-xl">
            <summary className="px-4 py-3 text-sm font-semibold text-slate-800 cursor-pointer">Índice del manual</summary>
            <div className="px-2 pb-3">{toc}</div>
          </details>

          {/* ── Contenido ─────────────────────────────────────────────────── */}
          <div className="space-y-6 min-w-0">
            {visibleSections.map(s => {
              const href = appLink(s);
              return (
                <section key={s.id} aria-labelledby={`${s.id}-h`} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <header id={s.id} data-spy className="scroll-mt-20 px-5 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 id={`${s.id}-h`} className="font-display text-lg font-bold text-slate-900 flex items-baseline gap-2">
                        <span className="font-data text-sm text-amber-600 tabular-nums">{s.number}.</span>
                        <Highlight text={s.title} q={q} />
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">{s.summary}</p>
                    </div>
                    {href && s.link && (
                      <Link
                        to={href}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50 whitespace-nowrap"
                      >
                        {s.link.label}
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </Link>
                    )}
                  </header>
                  <div className="px-5 py-4 space-y-5">
                    {s.blocks && s.blocks.length > 0 && (
                      <div className="space-y-3">
                        {s.blocks.map((b, i) => <Block key={i} block={b} q={q} onGoTo={goTo} />)}
                      </div>
                    )}
                    {s.subsections.map(sub => (
                      <div key={sub.id} id={sub.id} data-spy className="scroll-mt-20 space-y-3">
                        <h3 className="text-sm font-semibold text-slate-900 flex items-baseline gap-2">
                          <span className="font-data text-xs text-slate-400 tabular-nums">{sub.number}</span>
                          <Highlight text={sub.title} q={q} />
                        </h3>
                        {sub.blocks.map((b, i) => <Block key={i} block={b} q={q} onGoTo={goTo} />)}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* ── Preguntas frecuentes ────────────────────────────────────── */}
            {visibleFaq.length > 0 && (
              <section aria-labelledby={`${FAQ_ID}-h`} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <header id={FAQ_ID} data-spy className="scroll-mt-20 px-5 py-4 border-b border-slate-100">
                  <h2 id={`${FAQ_ID}-h`} className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-500" aria-hidden="true" /> Preguntas frecuentes
                  </h2>
                </header>
                <div className="divide-y divide-slate-100">
                  {visibleFaq.map(f => (
                    <details key={f.q} open={!!q} className="group px-5 py-3">
                      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-medium text-slate-800">
                        <span><Highlight text={f.q} q={q} /></span>
                        <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90 flex-shrink-0" aria-hidden="true" />
                      </summary>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed"><RichText text={f.a} q={q} onGoTo={goTo} /></p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* ── Glosario ────────────────────────────────────────────────── */}
            {visibleGlossary.length > 0 && (
              <section aria-labelledby={`${GLOSSARY_ID}-h`} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <header id={GLOSSARY_ID} data-spy className="scroll-mt-20 px-5 py-4 border-b border-slate-100">
                  <h2 id={`${GLOSSARY_ID}-h`} className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BookA className="w-5 h-5 text-amber-500" aria-hidden="true" /> Glosario
                  </h2>
                </header>
                <dl className="grid sm:grid-cols-2 gap-px bg-slate-100">
                  {visibleGlossary.map(g => (
                    <div key={g.term} className="bg-white px-5 py-3">
                      <dt className="text-sm font-semibold text-slate-900"><Highlight text={g.term} q={q} /></dt>
                      <dd className="mt-0.5 text-sm text-slate-600"><Highlight text={g.definition} q={q} /></dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {q && resultCount === 0 && (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl py-12 text-center">
                <Search className="w-6 h-6 text-slate-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-slate-600">No encontramos «{query.trim()}» en el manual.</p>
                <p className="text-xs text-slate-500 mt-1">Pruebe con otra palabra o pregúntele al asistente.</p>
                <button
                  type="button"
                  onClick={() => openAssistant(query.trim())}
                  className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 text-slate-900 text-sm font-semibold hover:bg-amber-400"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  Preguntar «{query.trim()}» al asistente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })}
          aria-label="Volver al inicio del manual"
          className="fixed bottom-24 right-6 z-30 w-10 h-10 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <ArrowUp className="w-4 h-4" aria-hidden="true" />
        </button>
      )}

      {!assistantOpen && (
        <button
          type="button"
          onClick={() => openAssistant()}
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 pl-4 pr-5 h-12 rounded-full bg-slate-900 text-white text-sm font-semibold shadow-lg hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
          Preguntar al manual
        </button>
      )}

      <ManualAssistant
        open={assistantOpen}
        onClose={closeAssistant}
        initialQuestion={assistantQuestion}
        renderText={text => (
          <RichText
            text={text}
            q=""
            onGoTo={id => {
              // En pantallas chicas el panel tapa el manual: se cierra para mostrar la sección
              if (!window.matchMedia('(min-width: 1024px)').matches) closeAssistant();
              setQuery('');
              requestAnimationFrame(() => goTo(id));
            }}
          />
        )}
      />
    </DashboardLayout>
  );
};
