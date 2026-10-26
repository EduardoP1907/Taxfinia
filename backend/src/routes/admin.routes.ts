import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getAccessUser, isPrivileged, isSubscriptionActive, currentYear } from '../services/access.service';
import { renewSubscription, setUserExempt, setUserMaxCompanies, setUserActive, deleteUserAccount, AccountError } from '../services/subscription.service';

const router = Router();

// Tope de seguridad para el cupo de empresas de un usuario
const MAX_COMPANIES_LIMIT = 100;

router.use(authMiddleware);

// El rol se lee de la BD (el del token puede estar desactualizado)
router.use(async (req: Request, res: Response, next: NextFunction) => {
  const user = await getAccessUser(req.user!.userId).catch(() => null);
  if (user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Solo administradores' });
    return;
  }
  next();
});

/** GET /api/admin/users — usuarios con su vigencia y empresas */
router.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true,
        isActive: true, isExempt: true, maxCompanies: true, subscriptionEndsAt: true, createdAt: true, lastLogin: true,
        companies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, name: true, taxId: true, industry: true, country: true, currency: true,
            isEnabled: true, createdAt: true,
            // Solo ejercicios anuales (los mensuales/trimestrales usan quarter/month ≠ 0)
            fiscalYears: {
              where: { quarter: 0, month: 0 },
              select: { year: true, consolidatedAt: true },
              orderBy: { year: 'asc' },
            },
            _count: { select: { reports: true, monthlyReports: true, comparisonReports: true } },
          },
        },
      },
    });
    res.json({
      success: true,
      data: users.map(u => ({
        ...u,
        companies: u.companies.map(({ fiscalYears, _count, ...c }) => ({
          ...c,
          annualYears: fiscalYears.map(f => f.year),
          consolidatedYears: fiscalYears.filter(f => f.consolidatedAt).map(f => f.year),
          reportCount: _count.reports + _count.monthlyReports + _count.comparisonReports,
        })),
        privileged: isPrivileged(u),
        subscriptionActive: u.isActive && isSubscriptionActive(u),
      })),
    });
  } catch (err: any) {
    console.error('[ADMIN] Error listando usuarios:', err);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

/** POST /api/admin/users/:id/renew — { year? } renueva hasta el 31-dic */
router.post('/users/:id/renew', async (req: Request, res: Response) => {
  try {
    const cy = currentYear();
    const year = req.body?.year !== undefined ? parseInt(req.body.year, 10) : cy;
    if (isNaN(year) || year < cy || year > cy + 1) {
      res.status(400).json({ error: `Año de renovación inválido (permitido: ${cy} o ${cy + 1})` });
      return;
    }
    const user = await renewSubscription(req.params.id, year);
    res.json({ success: true, data: user });
  } catch (err: any) {
    console.error('[ADMIN] Error renovando suscripción:', err);
    res.status(500).json({ error: 'Error al renovar la suscripción' });
  }
});

/** PUT /api/admin/users/:id/exempt — { isExempt: boolean } */
router.put('/users/:id/exempt', async (req: Request, res: Response) => {
  try {
    if (typeof req.body?.isExempt !== 'boolean') {
      res.status(400).json({ error: 'isExempt debe ser verdadero o falso' });
      return;
    }
    const user = await setUserExempt(req.params.id, req.body.isExempt);
    res.json({ success: true, data: user });
  } catch (err: any) {
    console.error('[ADMIN] Error cambiando exención:', err);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

/** PUT /api/admin/users/:id/max-companies — { maxCompanies: entero ≥ 1 } cupo de empresas */
router.put('/users/:id/max-companies', async (req: Request, res: Response) => {
  try {
    const max = req.body?.maxCompanies;
    if (!Number.isInteger(max) || max < 1 || max > MAX_COMPANIES_LIMIT) {
      res.status(400).json({ error: `El cupo de empresas debe ser un número entero entre 1 y ${MAX_COMPANIES_LIMIT}` });
      return;
    }
    const user = await setUserMaxCompanies(req.params.id, max);
    res.json({ success: true, data: user });
  } catch (err: any) {
    console.error('[ADMIN] Error cambiando cupo de empresas:', err);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

/** PUT /api/admin/users/:id/active —{ isActive: boolean } habilita/deshabilita la cuenta */
router.put('/users/:id/active', async (req: Request, res: Response) => {
  try {
    if (typeof req.body?.isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive debe ser verdadero o falso' });
      return;
    }
    const user = await setUserActive(req.params.id, req.body.isActive);
    res.json({ success: true, data: user });
  } catch (err: any) {
    if (err instanceof AccountError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error('[ADMIN] Error cambiando habilitación:', err);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

/** PUT /api/admin/companies/:id/enabled — { isEnabled: boolean } habilita/deshabilita una empresa */
router.put('/companies/:id/enabled', async (req: Request, res: Response) => {
  try {
    if (typeof req.body?.isEnabled !== 'boolean') {
      res.status(400).json({ error: 'isEnabled debe ser verdadero o falso' });
      return;
    }
    const exists = await prisma.company.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { id: true } });
    if (!exists) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: { isEnabled: req.body.isEnabled },
      select: { id: true, name: true, isEnabled: true },
    });
    res.json({ success: true, data: company });
  } catch (err: any) {
    console.error('[ADMIN] Error cambiando habilitación de empresa:', err);
    res.status(500).json({ error: 'Error al actualizar la empresa' });
  }
});

/** DELETE /api/admin/users/:id — elimina la cuenta y todos sus datos (irreversible) */
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await deleteUserAccount(req.params.id, req.user!.userId);
    res.json({ success: true, data: user });
  } catch (err: any) {
    if (err instanceof AccountError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error('[ADMIN] Error eliminando cuenta:', err);
    res.status(500).json({ error: 'Error al eliminar la cuenta' });
  }
});

export default router;
