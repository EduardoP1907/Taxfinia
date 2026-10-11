import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { financialService } from '../../services/financial.service';

interface YearSelectorProps {
  companyId: string;
  currentYear: number;
  onYearChange: (year: number) => void;
}

/**
 * Selector del ejercicio a visualizar. Solo lista ejercicios ANUALES; los años
 * nuevos se agregan desde «Datos Anuales», que aplica las reglas de ejercicios
 * consecutivos y la ventana de años permitidos.
 */
export const YearSelector: React.FC<YearSelectorProps> = ({
  companyId,
  currentYear,
  onYearChange,
}) => {
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    financialService.getAnnualFiscalYears(companyId)
      .then(fys => setAvailableYears([...new Set(fys.map(fy => fy.year))].sort((a, b) => b - a)))
      .catch(err => console.error('Error loading fiscal years:', err));
  }, [companyId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <Calendar className="w-4 h-4 text-gray-500" aria-hidden="true" />
        <span className="font-semibold text-gray-900">Ejercicio {currentYear}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* Capa para cerrar al hacer clic fuera */}
          <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">
                Ejercicios disponibles
              </div>
              <ul role="listbox" aria-label="Ejercicios disponibles" className="max-h-60 overflow-y-auto">
                {availableYears.length > 0 ? (
                  availableYears.map(year => (
                    <li key={year} role="option" aria-selected={year === currentYear}>
                      <button
                        type="button"
                        onClick={() => {
                          onYearChange(year);
                          setOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors tabular-nums ${
                          year === currentYear
                            ? 'bg-amber-50 text-amber-700 font-semibold'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        Ejercicio {year}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm text-gray-500">
                    No hay ejercicios cargados
                  </li>
                )}
              </ul>
              <p className="border-t border-gray-100 mt-2 pt-2 px-2 text-xs text-gray-500">
                Para agregar ejercicios, ve a «Datos Anuales».
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
