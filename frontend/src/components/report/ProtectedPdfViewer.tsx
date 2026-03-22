import React, { useEffect, useRef, useState } from 'react';

// Dynamic import to avoid SSR/worker issues
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // v3 uses .js worker
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.js',
      import.meta.url
    ).toString();
  }
  return pdfjsLib;
}

interface Props {
  pdfUrl: string;
  watermarkText: string;
}

const SCALE = 1.5;

export const ProtectedPdfViewer: React.FC<Props> = ({ pdfUrl, watermarkText }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [renderedPages, setRenderedPages] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      setLoading(true);
      setError(null);
      setRenderedPages(0);
      setTotalPages(0);

      try {
        const pdfjs = await getPdfJs();

        // Fetch PDF as ArrayBuffer — bypasses the browser's built-in PDF viewer
        const res = await fetch(pdfUrl);
        if (!res.ok) throw new Error(`Error al cargar el PDF (${res.status})`);
        const buffer = await res.arrayBuffer();

        if (cancelled) return;

        const loadingTask = (pdfjs as any).getDocument({ data: buffer });
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        setTotalPages(pdf.numPages);

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: SCALE });

          const wrapper = document.createElement('div');
          wrapper.style.marginBottom = '16px';
          wrapper.style.display = 'flex';
          wrapper.style.justifyContent = 'center';

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = 'block';
          canvas.style.boxShadow = '0 4px 24px rgba(0,0,0,0.35)';
          canvas.style.borderRadius = '4px';
          canvas.style.maxWidth = '100%';

          // Prevent right-click download
          canvas.addEventListener('contextmenu', e => e.preventDefault());
          // Prevent drag
          canvas.addEventListener('dragstart', e => e.preventDefault());

          wrapper.appendChild(canvas);
          container.appendChild(wrapper);

          const ctx = canvas.getContext('2d')!;

          await page.render({ canvasContext: ctx, viewport }).promise;

          if (cancelled) return;

          // Burn watermark into canvas pixels
          drawWatermark(ctx, viewport.width, viewport.height, watermarkText);

          setRenderedPages(pageNum);
        }

        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          console.error('PDF render error:', err);
          setError(err?.message || 'Error al renderizar el PDF.');
          setLoading(false);
        }
      }
    };

    render();
    return () => { cancelled = true; };
  }, [pdfUrl, watermarkText]);

  return (
    <div
      className="relative w-full h-full overflow-y-auto bg-slate-800 px-4 py-4 select-none"
      onContextMenu={e => e.preventDefault()}
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-800 z-10">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-300">
            {totalPages > 0
              ? `Renderizando página ${renderedPages} de ${totalPages}…`
              : 'Cargando informe…'}
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-full">
          <p className="text-red-400 text-sm bg-red-900/30 border border-red-700 rounded-lg px-4 py-3">{error}</p>
        </div>
      )}

      <div ref={containerRef} />
    </div>
  );
};

// ─── Watermark helper ──────────────────────────────────────────────────────────
function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  // Tiled diagonal watermark
  ctx.save();
  const fontSize = Math.round(w / 18);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1e293b';
  ctx.globalAlpha = 0.18;

  const tileW = w * 0.6;
  const tileH = h * 0.12;
  const cols = Math.ceil(w / tileW) + 2;
  const rows = Math.ceil(h / tileH) + 6;

  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);

  for (let r = -rows; r <= rows; r++) {
    for (let c = -cols; c <= cols; c++) {
      ctx.fillText(text, c * tileW, r * tileH);
    }
  }
  ctx.restore();

  // Large center watermark
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = '#0f172a';
  const bigSize = Math.round(w / 9);
  ctx.font = `900 ${bigSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.fillText('SOLO PREVISUALIZACIÓN', 0, 0);
  ctx.restore();
}
