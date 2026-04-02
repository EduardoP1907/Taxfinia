import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import crypto from 'crypto';
import prisma from '../config/database';

const router = Router();
const authController = new AuthController();

// Validaciones
const registerValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
];

const verifyOtpValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Código OTP debe tener 6 dígitos'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
];

const resendOtpValidation = [
  body('email').isEmail().withMessage('Email inválido'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Email inválido'),
];

const resetPasswordValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Código debe tener 6 dígitos'),
  body('newPassword').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
];

// Rutas
router.post('/register', registerValidation, authController.register);
router.post('/verify-otp', verifyOtpValidation, authController.verifyOtp);
router.post('/login', loginValidation, authController.login);
router.post('/resend-otp', resendOtpValidation, authController.resendOtp);
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);
router.post('/logout', authController.logout);

// Ruta protegida
router.get('/me', authMiddleware, authController.getCurrentUser);

/** GET /api/auth/invite-tokens/:token/validate — check if token is valid (public) */
router.get('/invite-tokens/:token/validate', async (req: any, res: any) => {
  try {
    const record = await (prisma as any).inviteToken.findFirst({
      where: { token: req.params.token, usedById: null },
      select: { id: true },
    });
    res.json({ valid: !!record });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Invite Tokens ─────────────────────────────────────────────────────

/** Only ADMIN role can access these */
function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
}

/** POST /api/auth/admin/invite-tokens — generate a new invite token */
router.post('/admin/invite-tokens', authMiddleware, requireAdmin, async (req: any, res: any) => {
  try {
    const token = crypto.randomBytes(12).toString('hex');
    const record = await (prisma as any).inviteToken.create({
      data: { token, createdById: req.user.userId },
    });
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.json({ token: record.token, url: `${baseUrl}/register?invite=${record.token}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/auth/admin/invite-tokens — list all tokens */
router.get('/admin/invite-tokens', authMiddleware, requireAdmin, async (req: any, res: any) => {
  try {
    const tokens = await (prisma as any).inviteToken.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, token: true, usedById: true, usedAt: true, createdAt: true },
    });
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.json({ tokens: tokens.map((t: any) => ({ ...t, url: `${baseUrl}/register?invite=${t.token}` })) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
