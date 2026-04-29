import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

/**
 * Middleware that rejects write operations if the company is locked.
 * Expects either :companyId in params, or resolves companyId via :fiscalYearId.
 */
export async function companyLockMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let companyId: string | undefined = req.params.companyId;

    // If route uses fiscalYearId, resolve to companyId — but skip lock for quarterly fiscal years
    if (!companyId && req.params.fiscalYearId) {
      const fy = await prisma.fiscalYear.findUnique({
        where: { id: req.params.fiscalYearId },
        select: { companyId: true, quarter: true },
      });
      if (fy && fy.quarter > 0) { next(); return; }
      companyId = fy?.companyId;
    }

    if (!companyId) { next(); return; }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { isLocked: true },
    });

    if (company?.isLocked) {
      res.status(403).json({
        error: 'Esta empresa está bloqueada. No se pueden modificar los datos financieros después de generar un informe IA o usar el asistente.',
        locked: true,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[LOCK] Middleware error:', error);
    next(); // fail open — don't block on internal errors
  }
}
