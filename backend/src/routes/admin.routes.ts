import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getAccessUser, isPrivileged, isSubscriptionActive, currentYear } from '../services/access.service';
import { renewSubscription, setUserExempt, setUserActive, deleteUserAccount, AccountError } from '../services/subscription.service';

const router = Router();

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
        isActive: true, isExempt: true, subscriptionEndsAt: true, createdAt: true, lastLogin: true,
        companies: { where: { deletedAt: null }, select: { id: true, name: true, taxId: true } },
      },
    });
    res.json({
      success: true,
      data: users.map(u => ({
        ...u,
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

/** PUT /api/admin/users/:id/active — { isActive: boolean } habilita/deshabilita la cuenta */
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
