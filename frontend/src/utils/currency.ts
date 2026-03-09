/**
 * Obtiene el símbolo de moneda para un código ISO
 */
export const getCurrencySymbol = (currency: string = 'EUR'): string => {
  const symbols: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    MXN: '$',
    ARS: '$',
    COP: '$',
    CLP: '$',
    PEN: 'S/',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    BRL: 'R$',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    INR: '₹',
  };

  return symbols[currency] || currency;
};

/**
 * Formatea un número con separadores de miles y decimales
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'EUR',
  showSymbol: boolean = true
): string => {
  const formatted = amount.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (!showSymbol) {
    return formatted;
  }

  const symbol = getCurrencySymbol(currency);
  return `${formatted} ${symbol} ${currency}`;
};

/**
 * Obtiene el formato completo de la moneda (símbolo + código)
 */
export const getFullCurrencyFormat = (currency: string = 'EUR'): string => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol} ${currency}`;
};
