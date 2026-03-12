import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';

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

export default router;
