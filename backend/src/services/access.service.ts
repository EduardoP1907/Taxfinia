/**
 * Reglas de acceso y antifraude:
 *  - Suscripción: vigente hasta el 31-dic del año en curso (hora de Chile). Vencida = solo lectura.
 *  - Usuarios privilegiados (rol ADMIN o isExempt): sin vencimiento ni bloqueos de datos.
 *  - Datos anuales: solo se editan años de la ventana [año actual − 5, año actual − 1]
 *    que no estén consolidados (incluidos en un informe IA o consultados por el asistente).
 *  - RUT: dígito verificador válido (empresas de Chile) y único en el sistema.
 */
import prisma from '../config/database';

const TIME_ZONE = 'America/Santiago';

export const MAX_ANNUAL_YEARS = 5;

// ─── Tiempo (Chile) ──────────────────────────────────────────────────────────

/** Año calendario actual en Chile (el cambio de año no depende de la zona del servidor). */
export function currentYear(now = new Date()): number {
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric' }).format(now), 10);
}

/**
 * Fin de la vigencia: 31-dic del año indicado a las 23:59:59 hora de Chile.
 * En diciembre Chile continental usa horario de verano (UTC−3).
 */
export function endOfSubscriptionYear(year: number): Date {
  return new Date(Date.UTC(year + 1, 0, 1, 3, 0, 0) - 1000);
}

/**
 * Período de pruebas: hasta el 31-12-2026 (23:59:59 hora de Chile) las cuentas
 * nuevas quedan habilitadas al registrarse. Después parten deshabilitadas y el
 * admin las habilita desde el panel.
 */
export const OPEN_REGISTRATION_UNTIL = endOfSubscriptionYear(2026);

export function isOpenRegistrationPeriod(now = new Date()): boolean {
  return now.getTime() <= OPEN_REGISTRATION_UNTIL.getTime();
}

/** Años anuales que se pueden cargar/editar: del año anterior hasta 5 años atrás. */
export function annualYearWindow(now = new Date()): { min: number; max: number } {
  const cy = currentYear(now);
  return { min: cy - MAX_ANNUAL_YEARS, max: cy - 1 };
}

// ─── Usuario ─────────────────────────────────────────────────────────────────

export interface AccessUser {
  id: string;
  role: string;
  isExempt: boolean;
  isActive: boolean;
  subscriptionEndsAt: Date | null;
}

export function isPrivileged(user: Pick<AccessUser, 'role' | 'isExempt'>): boolean {
  return user.role === 'ADMIN' || user.isExempt;
}

/** null en subscriptionEndsAt = cuenta legacy sin fecha (el script de migración la asigna). */
export function isSubscriptionActive(user: AccessUser, now = new Date()): boolean {
  if (isPrivileged(user)) return true;
  if (!user.subscriptionEndsAt) return true;
  return user.subscriptionEndsAt.getTime() > now.getTime();
}

// Caché corta: el middleware de auth consulta esto en cada escritura
const cache = new Map<string, { user: AccessUser; at: number }>();
const CACHE_MS = 30_000;

export async function getAccessUser(userId: string): Promise<AccessUser | null> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.user;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isExempt: true, isActive: true, subscriptionEndsAt: true },
  });
  if (user) cache.set(userId, { user, at: Date.now() });
  return user;
}

/** Llamar tras cambiar rol/exención/vigencia de un usuario. */
export function invalidateAccessUser(userId: string): void {
  cache.delete(userId);
}

export function formatDateCL(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

// ─── Datos anuales ───────────────────────────────────────────────────────────

/**
 * Lanza un error (en español) si el usuario no puede crear/editar el año anual indicado.
 * `fiscalYear` es el registro existente (si existe) para revisar la consolidación.
 */
export async function assertAnnualYearWritable(
  userId: string,
  year: number,
  fiscalYear?: { consolidatedAt: Date | null } | null,
): Promise<void> {
  const user = await getAccessUser(userId);
  if (!user) throw new AccessError('Usuario no encontrado', 401);
  if (isPrivileged(user)) return;

  if (fiscalYear?.consolidatedAt) {
    throw new AccessError(
      `El ejercicio ${year} ya fue incluido en un informe o consultado con el asistente IA: es solo lectura.`,
      403,
      { consolidated: true },
    );
  }

  const { min, max } = annualYearWindow();
  if (year < min || year > max) {
    throw new AccessError(
      `Solo se pueden cargar ejercicios cerrados entre ${min} y ${max}.`,
      403,
      { outOfWindow: true },
    );
  }
}

/**
 * Consolida (deja en solo lectura) los ejercicios anuales con datos de la empresa.
 * Se llama al generar el informe anual y al usar el asistente IA.
 * No aplica a empresas de usuarios privilegiados.
 */
export async function consolidateAnnualYears(companyId: string): Promise<number> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { user: { select: { role: true, isExempt: true } } },
  });
  if (!company || isPrivileged(company.user)) return 0;

  const result = await prisma.fiscalYear.updateMany({
    where: {
      companyId,
      quarter: 0,
      month: 0,
      consolidatedAt: null,
      OR: [{ balanceSheet: { isNot: null } }, { incomeStatement: { isNot: null } }],
    },
    data: { consolidatedAt: new Date() },
  });
  return result.count;
}

/** Admin: vuelve a habilitar la edición de todos los ejercicios anuales de la empresa. */
export async function unconsolidateAnnualYears(companyId: string): Promise<void> {
  await prisma.fiscalYear.updateMany({
    where: { companyId, quarter: 0, month: 0 },
    data: { consolidatedAt: null },
  });
  await prisma.company.update({ where: { id: companyId }, data: { isLocked: false } });
}

/** ¿La empresa ya tiene informes o ejercicios consolidados? (bloquea identidad y eliminación) */
export async function companyHasConsolidatedData(companyId: string): Promise<boolean> {
  const [reports, consolidated] = await Promise.all([
    prisma.report.count({ where: { companyId } }),
    prisma.fiscalYear.count({ where: { companyId, consolidatedAt: { not: null } } }),
  ]);
  return reports > 0 || consolidated > 0;
}

// ─── RUT ─────────────────────────────────────────────────────────────────────

/** "12.345.678-k" → "12345678-K" (sin puntos, DV en mayúscula). */
export function normalizeRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

/** Valida el dígito verificador con módulo 11. */
export function isValidRut(raw: string): boolean {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  const expected = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return dv === expected;
}

/**
 * Normaliza y valida la identificación fiscal. En Chile exige un RUT válido.
 * Devuelve el valor a guardar.
 */
export function validateTaxId(taxId: string | undefined | null, country: string | undefined | null): string {
  const value = (taxId ?? '').trim();
  if (!value) throw new AccessError('La identificación fiscal (RUT/NIF) es obligatoria.', 400);
  if ((country ?? '').toUpperCase() === 'CL') {
    if (!isValidRut(value)) throw new AccessError('El RUT ingresado no es válido. Revisa el dígito verificador.', 400);
    return normalizeRut(value);
  }
  return value.toUpperCase();
}

/**
 * Comprueba que ningún otro usuario no privilegiado tenga ya una empresa activa con
 * esa identificación fiscal (se compara sin puntos, guiones ni espacios).
 */
export async function assertTaxIdAvailable(taxId: string, excludeCompanyId?: string): Promise<void> {
  const key = taxId.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT c.id
    FROM companies c
    JOIN users u ON u.id = c.user_id
    WHERE c.deleted_at IS NULL
      AND u.role <> 'ADMIN'
      AND u.is_exempt = false
      AND upper(regexp_replace(coalesce(c.tax_id, ''), '[^0-9A-Za-z]', '', 'g')) = ${key}
  `;
  if (rows.some(r => r.id !== excludeCompanyId)) {
    throw new AccessError('Ya existe una empresa registrada con esta identificación fiscal. Si es tuya, contacta al administrador.', 409);
  }
}

// ─── Errores ─────────────────────────────────────────────────────────────────

export class AccessError extends Error {
  constructor(message: string, public status: number, public extra: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AccessError';
  }
}
