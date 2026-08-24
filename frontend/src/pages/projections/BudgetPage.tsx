/**
 * BudgetPage — presupuesto mensual del año siguiente.
 *
 * Réplica exacta del Forecast Mensual (P&G + tasas de crecimiento + Balance
 * Proyectado), aplicada a year = año actual + 1. Reutiliza el mismo
 * MonthlyForecastShell/MonthlyForecastContent y los mismos endpoints
 * /api/monthly-forecast/:companyId/:year — el backend ya es genérico por año.
 */

import React from 'react';
import { MonthlyForecastShell } from './MonthlyForecastPage';

export const BudgetPage: React.FC = () => {
  const nextYear = new Date().getFullYear() + 1;

  return (
    <MonthlyForecastShell
      year={nextYear}
      titlePrefix="Budget"
      companySelectorDescription="Selecciona la empresa para presupuestar su próximo ejercicio"
    />
  );
};
