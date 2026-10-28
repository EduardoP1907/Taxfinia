import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { getAccessUser, isSubscriptionActive, formatDateCL } from '../services/access.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Escrituras permitidas con la suscripción vencida: solo acciones para VER o
// DESCARGAR informes ya generados y consultar el manual (no crean ni modifican datos financieros).
const READ_ONLY_ALLOWED = [
  /\/reports\/[^/]+\/preview-token$/,
  /\/(reports|monthly-reports|comparison-reports)\/[^/]+\/(generate-code|validate-code)$/,
  /\/auth\/logout$/,
  /\/manual-assistant\/?$/,
];

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  let decoded;
  try {
    // Read token from httpOnly cookie first, fallback to Authorization header
    const cookieToken = (req as any).cookies?.accessToken;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    decoded = verifyToken(token);
    req.user = decoded;
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  try {
    const user = await getAccessUser(decoded.userId);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    // El rol vigente se toma de la BD (el del token puede estar desactualizado)
    req.user = { ...decoded, role: user.role };

    // Cuenta deshabilitada por el admin → sin acceso (el frontend cierra la sesión)
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Tu cuenta no está habilitada. Contacta al administrador.',
        accountDisabled: true,
      });
    }

    // Suscripción vencida → modo solo lectura
    if (WRITE_METHODS.has(req.method)
      && !READ_ONLY_ALLOWED.some(r => r.test(req.originalUrl.split('?')[0]))
      && !isSubscriptionActive(user)) {
      const until = user.subscriptionEndsAt ? ` el ${formatDateCL(user.subscriptionEndsAt)}` : '';
      return res.status(403).json({
        error: `Tu suscripción venció${until}. La cuenta está en modo solo lectura: contacta al administrador para renovarla.`,
        subscriptionExpired: true,
      });
    }
  } catch (err) {
    console.error('[AUTH] Error verificando suscripción:', err);
    return res.status(500).json({ error: 'No se pudo verificar la suscripción. Inténtalo de nuevo.' });
  }

  next();
};

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookieToken = (req as any).cookies?.accessToken;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const token = cookieToken || headerToken;

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }

    next();
  } catch (error) {
    next();
  }
};
