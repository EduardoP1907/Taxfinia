// Países / regiones soportados y su moneda por defecto.
// Fuente: PROMETHEIA_26_paises_monedas.xlsx (26 entradas). Debe mantenerse
// sincronizado con backend/src/constants/countries.ts.

export interface CountryOption {
  code: string;      // código de 2 caracteres guardado en Company.country
  name: string;
  currency: string;  // código ISO 4217 por defecto
  altCurrencies?: string[]; // si el país admite más de una moneda (la primera es la por defecto)
}

export const COUNTRIES: CountryOption[] = [
  { code: 'AR', name: 'Argentina',          currency: 'ARS' },
  { code: 'BO', name: 'Bolivia',            currency: 'BOB' },
  { code: 'BR', name: 'Brasil',             currency: 'BRL' },
  { code: 'CL', name: 'Chile',              currency: 'CLP' },
  { code: 'CO', name: 'Colombia',           currency: 'COP' },
  { code: 'EC', name: 'Ecuador',            currency: 'USD' },
  { code: 'PY', name: 'Paraguay',           currency: 'PYG' },
  { code: 'PE', name: 'Perú',               currency: 'PEN' },
  { code: 'UY', name: 'Uruguay',            currency: 'UYU' },
  { code: 'VE', name: 'Venezuela',          currency: 'VES' },
  { code: 'GY', name: 'Guyana',             currency: 'GYD' },
  { code: 'SR', name: 'Surinam',            currency: 'SRD' },
  { code: 'US', name: 'Estados Unidos',     currency: 'USD' },
  { code: 'CA', name: 'Canadá',             currency: 'CAD' },
  { code: 'MX', name: 'México',             currency: 'MXN' },
  { code: 'GT', name: 'Guatemala',          currency: 'GTQ' },
  { code: 'HN', name: 'Honduras',           currency: 'HNL' },
  { code: 'SV', name: 'El Salvador',        currency: 'USD' },
  { code: 'NI', name: 'Nicaragua',          currency: 'NIO' },
  { code: 'CR', name: 'Costa Rica',         currency: 'CRC' },
  { code: 'PA', name: 'Panamá',             currency: 'USD', altCurrencies: ['USD', 'PAB'] }, // Balboa / USD
  { code: 'BZ', name: 'Belice',             currency: 'BZD' },
  { code: 'EU', name: 'Zona euro (Europa)', currency: 'EUR' },
  { code: 'GB', name: 'Gran Bretaña',       currency: 'GBP' },
  { code: 'IE', name: 'Irlanda',            currency: 'EUR' },
  { code: 'SC', name: 'Escocia',            currency: 'GBP' }, // código propio (no ISO)
];

export const CURRENCIES: { code: string; name: string; symbol: string }[] = [
  { code: 'ARS', name: 'Peso argentino',       symbol: '$' },
  { code: 'BOB', name: 'Boliviano',            symbol: 'Bs' },
  { code: 'BRL', name: 'Real brasileño',       symbol: 'R$' },
  { code: 'CLP', name: 'Peso chileno',         symbol: '$' },
  { code: 'COP', name: 'Peso colombiano',      symbol: '$' },
  { code: 'USD', name: 'Dólar estadounidense', symbol: 'US$' },
  { code: 'PYG', name: 'Guaraní',              symbol: '₲' },
  { code: 'PEN', name: 'Sol peruano',          symbol: 'S/' },
  { code: 'UYU', name: 'Peso uruguayo',        symbol: '$U' },
  { code: 'VES', name: 'Bolívar venezolano',   symbol: 'Bs.' },
  { code: 'GYD', name: 'Dólar guyanés',        symbol: 'G$' },
  { code: 'SRD', name: 'Dólar surinamés',      symbol: '$' },
  { code: 'CAD', name: 'Dólar canadiense',     symbol: 'C$' },
  { code: 'MXN', name: 'Peso mexicano',        symbol: '$' },
  { code: 'GTQ', name: 'Quetzal',              symbol: 'Q' },
  { code: 'HNL', name: 'Lempira',              symbol: 'L' },
  { code: 'NIO', name: 'Córdoba',              symbol: 'C$' },
  { code: 'CRC', name: 'Colón costarricense',  symbol: '₡' },
  { code: 'PAB', name: 'Balboa',               symbol: 'B/.' },
  { code: 'BZD', name: 'Dólar beliceño',       symbol: 'BZ$' },
  { code: 'EUR', name: 'Euro',                 symbol: '€' },
  { code: 'GBP', name: 'Libra esterlina',      symbol: '£' },
];

// Códigos usados antes del catálogo de 26 países.
const LEGACY_COUNTRY_CODES: Record<string, string> = { ES: 'EU', FR: 'EU', DE: 'EU', UK: 'GB' };

export function normalizeCountryCode(code?: string | null): string {
  const c = (code ?? '').toUpperCase();
  return LEGACY_COUNTRY_CODES[c] ?? c;
}

export function countryName(code?: string | null): string {
  const c = normalizeCountryCode(code);
  return COUNTRIES.find((x) => x.code === c)?.name ?? (code || 'No especificado');
}

export function countryCurrency(code?: string | null): string | undefined {
  const c = normalizeCountryCode(code);
  return COUNTRIES.find((x) => x.code === c)?.currency;
}

export function currencySymbol(code?: string | null): string {
  return CURRENCIES.find((x) => x.code === code)?.symbol ?? (code || '');
}

/** Monedas permitidas para un país (todas las del Excel; Panamá admite PAB o USD). */
export function allowedCurrencies(code?: string | null): string[] {
  const c = COUNTRIES.find((x) => x.code === normalizeCountryCode(code));
  return c ? (c.altCurrencies ?? [c.currency]) : [];
}

/** La moneda siempre se deriva del país; si no es válida para ese país se usa la por defecto. */
export function resolveCurrency(country?: string | null, currency?: string | null): string {
  const allowed = allowedCurrencies(country);
  if (allowed.length === 0) return currency || 'CLP';
  return currency && allowed.includes(currency) ? currency : allowed[0];
}

/** Moneda efectiva de una empresa (derivada de su país). Usar en toda la UI. */
export function companyCurrency(company?: { country?: string | null; currency?: string | null } | null): string {
  return resolveCurrency(company?.country, company?.currency);
}
