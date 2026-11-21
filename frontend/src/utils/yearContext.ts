import type { Company } from '../types/company';

export interface CompanyYears {
  lastClosedYear: number | null;
  reportYear: number;
  forecastYear: number;
  budgetYear: number;
  latestClosableYear: number;
  /** Forecast/Budget/informes piden cerrar el ejercicio pendiente antes de continuar. */
  needsClosing: boolean;
}

/**
 * Años de trabajo de una empresa a partir de su último ejercicio cerrado (L).
 * Sin empresa (o sin datos del backend) usa el calendario solo para rotular el menú.
 */
export function companyYears(company?: Pick<Company, 'yearContext'> | null): CompanyYears {
  const cy = new Date().getFullYear();
  const yc = company?.yearContext;
  const L = yc?.lastClosedYear ?? null;
  const reportYear = L ?? cy - 1;
  return {
    lastClosedYear: L,
    reportYear,
    forecastYear: reportYear + 1,
    budgetYear: reportYear + 2,
    latestClosableYear: yc?.latestClosableYear ?? cy - 1,
    needsClosing: yc?.needsClosing ?? false,
  };
}

/** Mensaje para la empresa que aún no cierra su ejercicio pendiente. */
export function needsClosingMessage(y: CompanyYears): string {
  return y.lastClosedYear === null
    ? `Aún no hay un ejercicio anual cerrado. Carga el ejercicio ${y.latestClosableYear} en "Datos Financieros" y ciérralo para continuar.`
    : `Tu último ejercicio cerrado es ${y.lastClosedYear}. Carga y cierra el ejercicio ${y.latestClosableYear} en "Datos Financieros" para continuar.`;
}
