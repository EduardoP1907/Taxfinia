import React, { useState } from 'react';
import { Download, RefreshCw, XCircle, KeyRound } from 'lucide-react';

interface DownloadCodeModalProps {
  onConfirm: (code: string) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
}

export const DownloadCodeModal: React.FC<DownloadCodeModalProps> = ({ onConfirm, onCancel, loading, error }) => {
  const [code, setCode] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <KeyRound className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Código de Descarga</h3>
            <p className="text-xs text-slate-500">Ingresa el código proporcionado por el administrador</p>
          </div>
        </div>

        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="PROMETHEIA-XXXX-XXXX"
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-center font-mono text-lg tracking-widest text-slate-900 mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && code.trim()) onConfirm(code.trim()); }}
        />

        {error && (
          <p className="text-sm text-red-600 mb-3 flex items-center gap-1">
            <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => code.trim() && onConfirm(code.trim())}
            disabled={!code.trim() || loading}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
};
