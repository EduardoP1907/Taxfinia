import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { assertAnnualYearWritable, AccessError } from '../services/access.service';

/**
 * Bloqueo de datos ANUALES por ejercicio (no por empresa):
 *  - Ejercicios consolidados (incluidos en un informe IA o consultados con el asistente) → solo lectura.
 *  - Solo se crean/editan ejercicios cerrados dentro de la ventana [año actual − 5, año actual − 1].
 * Los registros trimestrales/mensuales (quarter/month > 0) no se bloquean.
 *
 * Rutas soportadas:
 *  - :fiscalYearId           → edición de un ejercicio existente
 *  - :companyId + body.year  → creación de un ejercicio (si ya existe, no se modifica nada)
 *  - :companyId sin año (importación) → el controlador valida cada año importado
 */
export async function companyLockMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    if (req.params.fiscalYearId) {
      const fy = await prisma.fiscalYear.findUnique({
        where: { id: req.params.fiscalYearId },
        select: { year: true, quarter: true, month: true, consolidatedAt: true },
      });
      if (!fy || fy.quarter > 0 || fy.month > 0) { next(); return; }
      await assertAnnualYearWritable(userId, fy.year, fy);
      next();
      return;
    }

    const { companyId } = req.params;
    const year = parseInt(req.body?.year, 10);
    const quarter = parseInt(req.body?.quarter ?? '0', 10) || 0;
    const month = parseInt(req.body?.month ?? '0', 10) || 0;
    if (companyId && !isNaN(year) && quarter === 0 && month === 0) {
      const existing = await prisma.fiscalYear.findFirst({
        where: { companyId, year, quarter: 0, month: 0 },
        select: { id: true },
      });
      // Crear un ejercicio ya existente solo lo devuelve: no hay nada que bloquear
      if (!existing) await assertAnnualYearWritable(userId, year);
    }

    next();
  } catch (error) {
    if (error instanceof AccessError) {
      res.status(error.status).json({ error: error.message, locked: true, ...error.extra });
      return;
    }
    console.error('[LOCK] Middleware error:', error);
    res.status(500).json({ error: 'No se pudo verificar el estado del ejercicio. Inténtalo de nuevo.' });
  }
}
