/**
 * Cierre de ejercicios anuales y "año de trabajo" de cada empresa.
 *
 * El cambio de año ya no depende del calendario sino del último ejercicio anual que
 * el usuario confirmó como cerrado (L), por empresa:
 *   - Informe Financiero Anual → L
 *   - Forecast mensual         → L + 1
 *   - Budget                   → L + 2
 *   - Proyecciones 4.1/4.3     → año base L (los escenarios con base anterior muestran un aviso)
 *
 * Ej.: el 1-ene-2027 la empresa sigue en L = 2025 hasta que carga 2026 y lo cierra.
 * Si L queda más de un año atrás del último que ya podría estar cerrado (año actual − 2),
 * Forecast y Budget piden cerrar el ejercicio pendiente.
 */
import prisma from '../config/database';
import { AccessError, annualYearWindow, currentYear, getAccessUser, isPrivileged } from './access.service';

export interface YearContext {
  /** Último ejercicio anual cerrado por el usuario (null = ninguno). */
  lastClosedYear: number | null;
  reportYear: number | null;
  forecastYear: number | null;
  budgetYear: number | null;
  /** Último ejercicio que ya puede cerrarse según el calendario (año actual − 1). */
  latestClosableYear: number;
  /** true si no hay ejercicio cerrado o si L < año actual − 2: Forecast/Budget piden cerrar el pendiente. */
  needsClosing: boolean;
}

export function buildYearContext(lastClosedYear: number | null, now = new Date()): YearContext {
  const cy = currentYear(now);
  return {
    lastClosedYear,
    reportYear: lastClosedYear,
    forecastYear: lastClosedYear !== null ? lastClosedYear + 1 : null,
    budgetYear: lastClosedYear !== null ? lastClosedYear + 2 : null,
    latestClosableYear: cy - 1,
    needsClosing: lastClosedYear === null || lastClosedYear < cy - 2,
  };
}

/** Filtro de ejercicio anual cerrado y con ambos estados financieros. */
const closedAnnualWhere = {
  quarter: 0,
  month: 0,
  closedAt: { not: null },
  incomeStatement: { isNot: null },
  balanceSheet: { isNot: null },
} as const;

/** Último ejercicio cerrado por empresa. */
export async function getLastClosedYears(companyIds: string[]): Promise<Map<string, number>> {
  if (companyIds.length === 0) return new Map();
  const rows = await prisma.fiscalYear.groupBy({
    by: ['companyId'],
    where: { companyId: { in: companyIds }, ...closedAnnualWhere },
    _max: { year: true },
  });
  return new Map(rows.filter(r => r._max.year !== null).map(r => [r.companyId, r._max.year as number]));
}

export async function getLastClosedYear(companyId: string): Promise<number | null> {
  return (await getLastClosedYears([companyId])).get(companyId) ?? null;
}

export async function getYearContext(companyId: string): Promise<YearContext> {
  return buildYearContext(await getLastClosedYear(companyId));
}

const num = (v: unknown) => (v == null ? 0 : parseFloat(String(v)));

/** Cuadratura del balance tolerando 1 unidad de redondeo. */
function balanceIssues(bs: Record<string, unknown> | null): string | null {
  if (!bs) return 'falta el Balance de Situación';
  const assets = ['tangibleAssets', 'intangibleAssets', 'financialInvestmentsLp', 'otherNoncurrentAssets',
    'inventory', 'accountsReceivable', 'otherReceivables', 'taxReceivables', 'cashEquivalents']
    .reduce((s, k) => s + num(bs[k]), 0);
  const liabEq = ['shareCapital', 'reserves', 'retainedEarnings', 'provisionsLp', 'bankDebtLp',
    'otherLiabilitiesLp', 'provisionsSp', 'bankDebtSp', 'accountsPayable', 'taxLiabilities', 'otherLiabilitiesSp']
    .reduce((s, k) => s + num(bs[k]), 0) - num(bs.treasuryStock);
  if (assets <= 0) return 'el Balance de Situación no tiene activos';
  if (Math.abs(assets - liabEq) > 1) return 'el balance no cuadra (Total Activo ≠ Patrimonio Neto + Pasivo)';
  return null;
}

async function loadOwnedAnnualYear(fiscalYearId: string, userId: string) {
  const fy = await prisma.fiscalYear.findUnique({
    where: { id: fiscalYearId },
    include: { company: { select: { userId: true, deletedAt: true } }, balanceSheet: true, incomeStatement: true },
  });
  if (!fy || fy.company.userId !== userId || fy.company.deletedAt) {
    throw new AccessError('Ejercicio no encontrado', 404);
  }
  if (fy.quarter > 0 || fy.month > 0) {
    throw new AccessError('Solo se pueden cerrar ejercicios anuales.', 400);
  }
  return fy;
}

/** Confirma el ejercicio como cerrado. Valida datos completos y que el año ya haya terminado. */
export async function closeFiscalYear(fiscalYearId: string, userId: string) {
  const fy = await loadOwnedAnnualYear(fiscalYearId, userId);
  if (fy.closedAt) return { year: fy.year, yearContext: await getYearContext(fy.companyId) };

  const user = await getAccessUser(userId);
  if (!user) throw new AccessError('Usuario no encontrado', 401);
  if (!isPrivileged(user)) {
    const { min, max } = annualYearWindow();
    if (fy.year > max) {
      throw new AccessError(`El ejercicio ${fy.year} aún no termina: se podrá cerrar a partir del 1 de enero de ${fy.year + 1}.`, 403);
    }
    if (fy.year < min) {
      throw new AccessError(`Solo se pueden cerrar ejercicios entre ${min} y ${max}.`, 403);
    }
  }

  const problems: string[] = [];
  const bsIssue = balanceIssues(fy.balanceSheet as unknown as Record<string, unknown> | null);
  if (bsIssue) problems.push(bsIssue);
  if (!fy.incomeStatement) problems.push('falta la Cuenta de Pérdidas y Ganancias');
  else if (num(fy.incomeStatement.revenue) <= 0) problems.push('la Cuenta de Pérdidas y Ganancias no tiene ventas');
  if (problems.length > 0) {
    throw new AccessError(`No se puede cerrar el ejercicio ${fy.year}: ${problems.join('; ')}. Completa y guarda los datos antes de cerrarlo.`, 400);
  }

  await prisma.fiscalYear.update({ where: { id: fy.id }, data: { closedAt: new Date() } });
  return { year: fy.year, yearContext: await getYearContext(fy.companyId) };
}

/** Revierte un cierre hecho por error. No se permite si el ejercicio ya está consolidado. */
export async function reopenFiscalYear(fiscalYearId: string, userId: string) {
  const fy = await loadOwnedAnnualYear(fiscalYearId, userId);
  if (!fy.closedAt) return { year: fy.year, yearContext: await getYearContext(fy.companyId) };

  const user = await getAccessUser(userId);
  if (!user) throw new AccessError('Usuario no encontrado', 401);
  if (!isPrivileged(user) && fy.consolidatedAt) {
    throw new AccessError(
      `El ejercicio ${fy.year} ya fue incluido en un informe o consultado con el asistente IA: no se puede reabrir.`,
      403,
    );
  }

  await prisma.fiscalYear.update({ where: { id: fy.id }, data: { closedAt: null } });
  return { year: fy.year, yearContext: await getYearContext(fy.companyId) };
}
