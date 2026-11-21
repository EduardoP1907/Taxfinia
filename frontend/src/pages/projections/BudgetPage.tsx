/**
 * BudgetPage — presupuesto mensual del ejercicio siguiente al Forecast.
 *
 * Réplica del Forecast Mensual (P&G + tasas de crecimiento + Balance
 * Proyectado), aplicada a year = último ejercicio cerrado + 2 (el Forecast
 * es L + 1), pero en modo "budget": la base anual se toma del resultado
 * calculado del Forecast (no de los datos anuales cerrados de la empresa),
 * no existe el selector de "meses cerrados" y únicamente las tasas de
 * crecimiento (%) son editables — el resto de celdas son siempre de solo
 * lectura. Reutiliza el mismo MonthlyForecastShell/MonthlyForecastContent y
 * los mismos endpoints /api/monthly-forecast/:companyId/:year — el backend
 * distingue el modo vía ?mode=budget.
 */

import React from 'react';
import { MonthlyForecastShell } from './MonthlyForecastPage';

export const BudgetPage: React.FC = () => (
  <MonthlyForecastShell
    titlePrefix="Budget"
    companySelectorDescription="Selecciona la empresa para presupuestar su próximo ejercicio"
    mode="budget"
  />
);
