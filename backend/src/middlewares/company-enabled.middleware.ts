/**
 * Bloquea el acceso a empresas deshabilitadas por el admin.
 *
 * Se registra con router.param() en cada router: cualquier ruta que reciba el
 * id de una empresa, ejercicio, escenario o informe resuelve la empresa dueña y
 * responde 403 { companyDisabled: true } si está deshabilitada. El admin no se
 * ve afectado (gestiona las empresas desde su panel).
 */
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

type CompanyResolver = (id: string) => Promise<string | null | undefined>;

export const COMPANY_DISABLED_ERROR = 'Esta empresa está deshabilitada. Contacta al administrador.';

const byCompanyId: CompanyResolver = async id => id;

const byFiscalYearId: CompanyResolver = async id =>
  (await prisma.fiscalYear.findUnique({ where: { id }, select: { companyId: true } }))?.companyId;

const byScenarioId: CompanyResolver = async id =>
  (await prisma.projectionScenario.findUnique({ where: { id }, select: { companyId: true } }))?.companyId;

const byProjectionId: CompanyResolver = async id =>
  (await prisma.financialProjection.findUnique({ where: { id }, select: { scenario: { select: { companyId: true } } } }))
    ?.scenario.companyId;

const byReportId: CompanyResolver = async id =>
  (await prisma.report.findUnique({ where: { id }, select: { companyId: true } }))?.companyId;

const byMonthlyReportId: CompanyResolver = async id =>
  (await prisma.monthlyReport.findUnique({ where: { id }, select: { companyId: true } }))?.companyId;

const byComparisonReportId: CompanyResolver = async id =>
  (await prisma.comparisonReport.findUnique({ where: { id }, select: { companyId: true } }))?.companyId;

export const companyResolvers = {
  company: byCompanyId,
  fiscalYear: byFiscalYearId,
  scenario: byScenarioId,
  projection: byProjectionId,
  report: byReportId,
  monthlyReport: byMonthlyReportId,
  comparisonReport: byComparisonReportId,
};

async function isCompanyDisabled(companyId: string | null | undefined): Promise<boolean> {
  if (!companyId) return false; // inexistente: el controlador responde 404
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { isEnabled: true } });
  return company ? !company.isEnabled : false;
}

async function guard(req: Request, res: Response, next: NextFunction, companyId: Promise<string | null | undefined>) {
  if (req.user?.role === 'ADMIN') return next();
  try {
    if (await isCompanyDisabled(await companyId)) {
      return res.status(403).json({ error: COMPANY_DISABLED_ERROR, companyDisabled: true });
    }
    next();
  } catch (err) {
    console.error('[COMPANY] Error verificando si la empresa está habilitada:', err);
    res.status(500).json({ error: 'No se pudo verificar la empresa. Inténtalo de nuevo.' });
  }
}

/** Para router.param('<param>', requireEnabledCompany(companyResolvers.x)) */
export const requireEnabledCompany = (resolve: CompanyResolver) =>
  (req: Request, res: Response, next: NextFunction, value: string) => guard(req, res, next, resolve(value));

/** Para rutas que reciben la empresa en el body (ej. crear escenario) */
export const requireEnabledCompanyFromBody = (req: Request, res: Response, next: NextFunction) =>
  guard(req, res, next, Promise.resolve(typeof req.body?.companyId === 'string' ? req.body.companyId : null));
