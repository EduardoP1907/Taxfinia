/**
 * Tasas de crecimiento recomendadas a partir de los datos anuales históricos.
 *
 * Se usan como valores iniciales (editables) en la Hoja 4.0 y en las tasas
 * mensuales de Forecast / Budget: promedio del crecimiento interanual de los
 * últimos 3 años disponibles en "Datos anuales".
 */

export interface YearValue {
  year: number;
  value: number;
}

export const HISTORICAL_GROWTH_YEARS = 3;

// Límite de la tasa recomendada: promedios extremos (p.ej. +193% en conceptos
// pequeños y volátiles) compuestos durante 10 años desbordan los montos.
export const MAX_SUGGESTED_GROWTH = 0.5;
export const MIN_SUGGESTED_GROWTH = -0.5;

/**
 * Crecimiento interanual: actual / anterior − 1.
 * Devuelve null cuando no es interpretable: año anterior en 0, o cambio de
 * signo entre ambos años (p.ej. un neto financiero que pasa de + a −).
 * Funciona con valores negativos del mismo signo: −100 → −120 = +20%, que al
 * reaplicarse como anterior × (1 + tasa) reproduce −120.
 */
export function yearOverYearGrowth(prev: number, curr: number): number | null {
  if (prev === 0) return null;
  if (curr !== 0 && Math.sign(curr) !== Math.sign(prev)) return null;
  return curr / prev - 1;
}

/**
 * Promedio del crecimiento interanual de los últimos `years` años. Pares de
 * años no consecutivos o no interpretables se descartan del promedio.
 * El resultado se limita a [−50%, +50%]. Null si no hay ningún crecimiento calculable.
 */
export function averageHistoricalGrowth(
  series: YearValue[],
  years: number = HISTORICAL_GROWTH_YEARS,
): number | null {
  // Solo los últimos `years + 1` años: 4 años de datos → 3 crecimientos.
  const sorted = [...series].sort((a, b) => a.year - b.year).slice(-(years + 1));
  const growths: number[] = [];
  for (let i = sorted.length - 1; i > 0; i--) {
    const curr = sorted[i];
    const prev = sorted[i - 1];
    if (curr.year - prev.year !== 1) continue;
    const g = yearOverYearGrowth(prev.value, curr.value);
    if (g !== null) growths.push(g);
  }
  if (growths.length === 0) return null;
  const average = growths.reduce((s, g) => s + g, 0) / growths.length;
  return Math.min(MAX_SUGGESTED_GROWTH, Math.max(MIN_SUGGESTED_GROWTH, average));
}

/**
 * Tasa impositiva efectiva promedio (Impuestos / EBT) de los últimos `years`
 * años, considerando solo los que tienen EBT positivo. Null si no hay ninguno.
 */
export function averageEffectiveTaxRate(
  series: { year: number; ebt: number; incomeTax: number }[],
  years: number = HISTORICAL_GROWTH_YEARS,
): number | null {
  const rates = [...series]
    .sort((a, b) => b.year - a.year)
    .slice(0, years)
    .filter(s => s.ebt > 0)
    .map(s => s.incomeTax / s.ebt);
  if (rates.length === 0) return null;
  return rates.reduce((s, r) => s + r, 0) / rates.length;
}
