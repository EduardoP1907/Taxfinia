/** «5.37» → «5,37» (sin separador de miles), con hasta `decimals` decimales. */
export const formatPercentValue = (value: number, decimals = 2): string =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: decimals, useGrouping: false }).format(value);

/** Formatea una tasa en decimal (0.0537) como «5,37%» para mostrarla como referencia. */
export const formatRateReference = (rate: number | null | undefined, decimals = 2): string =>
  rate === null || rate === undefined || isNaN(rate)
    ? 'sin datos'
    : `${formatPercentValue(rate * 100, decimals)}%`;
