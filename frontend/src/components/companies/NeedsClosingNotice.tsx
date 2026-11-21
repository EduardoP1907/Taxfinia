import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';
import { needsClosingMessage, type CompanyYears } from '../../utils/yearContext';

/** Aviso: la empresa debe cargar y cerrar su último ejercicio antes de usar esta sección. */
export const NeedsClosingNotice: React.FC<{ companyId: string; years: CompanyYears; title?: string }> = ({
  companyId, years, title = 'Ejercicio anual pendiente de cierre',
}) => (
  <div role="status" className="max-w-2xl mx-auto mt-10 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
    <CalendarCheck className="w-10 h-10 text-amber-600 mx-auto mb-3" aria-hidden="true" />
    <h2 className="text-lg font-semibold text-slate-900 mb-2">{title}</h2>
    <p className="text-sm text-slate-700 mb-5">{needsClosingMessage(years)}</p>
    <Link
      to={`/datos?companyId=${companyId}`}
      className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      Ir a Datos Financieros
    </Link>
  </div>
);
