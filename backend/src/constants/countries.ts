// Países / regiones soportados y su moneda por defecto.
// Fuente: PROMETHEIA_26_paises_monedas.xlsx (26 entradas). Debe mantenerse
// sincronizado con frontend/src/constants/countries.ts.

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  altCurrencies?: string[]; // si el país admite más de una moneda (la primera es la por defecto)
}

export const COUNTRIES: CountryInfo[] = [
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

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export const CURRENCY_CODES = [
  'ARS', 'BOB', 'BRL', 'CLP', 'COP', 'USD', 'PYG', 'PEN', 'UYU', 'VES', 'GYD',
  'SRD', 'CAD', 'MXN', 'GTQ', 'HNL', 'NIO', 'CRC', 'PAB', 'BZD', 'EUR', 'GBP',
];

// Códigos usados antes del catálogo de 26 países.
export const LEGACY_COUNTRY_CODES: Record<string, string> = { ES: 'EU', FR: 'EU', DE: 'EU', UK: 'GB' };

export function normalizeCountryCode(code?: string | null): string {
  const c = (code ?? '').toUpperCase();
  return LEGACY_COUNTRY_CODES[c] ?? c;
}

export function countryName(code?: string | null): string {
  const c = normalizeCountryCode(code);
  return COUNTRIES.find((x) => x.code === c)?.name ?? (code || 'No especificado');
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

const CURRENCY_NAMES: Record<string, string> = {
  ARS: 'Peso argentino', BOB: 'Boliviano', BRL: 'Real brasileño', CLP: 'Peso chileno',
  COP: 'Peso colombiano', USD: 'Dólar estadounidense', PYG: 'Guaraní', PEN: 'Sol peruano',
  UYU: 'Peso uruguayo', VES: 'Bolívar venezolano', GYD: 'Dólar guyanés', SRD: 'Dólar surinamés',
  CAD: 'Dólar canadiense', MXN: 'Peso mexicano', GTQ: 'Quetzal', HNL: 'Lempira', NIO: 'Córdoba',
  CRC: 'Colón costarricense', PAB: 'Balboa', BZD: 'Dólar beliceño', EUR: 'Euro', GBP: 'Libra esterlina',
};

/** Ej.: "Peso chileno (CLP)". */
export function currencyLabel(code?: string | null): string {
  if (!code) return 'No especificado';
  return CURRENCY_NAMES[code] ? `${CURRENCY_NAMES[code]} (${code})` : code;
}
