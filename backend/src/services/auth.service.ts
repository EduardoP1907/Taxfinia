import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { generateOtp, isOtpExpired } from '../utils/otp';
import { sendOtpEmail, sendPasswordResetEmail, sendNewUserNotificationEmail } from '../utils/email';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { config } from '../config/env';

export class AuthService {
  /**
   * Registrar un nuevo usuario
   */
  async register(email: string, password: string, firstName?: string, lastName?: string, inviteToken?: string) {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      if (existingUser.isVerified) {
        throw new Error('El email ya está registrado');
      }
      // Si existe pero no está verificado, eliminar el usuario antiguo y sus OTPs
      await prisma.otpCode.deleteMany({ where: { userId: existingUser.id } });
      await prisma.user.delete({ where: { id: existingUser.id } });
    }

    // Validate invite token (if provided)
    let validToken: { id: string } | null = null;
    if (inviteToken) {
      validToken = await (prisma as any).inviteToken.findFirst({
        where: { token: inviteToken, usedById: null },
        select: { id: true },
      });
      // If token is invalid, just ignore it (don't block registration)
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        ...(validToken ? { planType: 'TRIAL' } : {}),
      },
    });

    // Mark invite token as used
    if (validToken) {
      await (prisma as any).inviteToken.update({
        where: { id: validToken.id },
        data: { usedById: user.id, usedAt: new Date() },
      });
    }

    // Generar OTP
    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + config.otp.expirationMinutes * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        userId: user.id,
        code: otpCode,
        expiresAt,
      },
    });

    // Enviar email con OTP
    await sendOtpEmail(email, otpCode);

    // Notificar al administrador del nuevo registro (sin bloquear la respuesta)
    sendNewUserNotificationEmail({
      email,
      firstName,
      lastName,
      planType: validToken ? 'TRIAL' : 'STANDARD',
      hasInviteToken: !!validToken,
    }).catch(() => {});

    return {
      userId: user.id,
      email: user.email,
      message: 'Usuario registrado. Verifica tu email con el código OTP enviado.',
    };
  }

  /**
   * Verificar OTP
   */
  async verifyOtp(email: string, code: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.isVerified) {
      throw new Error('El usuario ya está verificado');
    }

    // Buscar OTP válido
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        code,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new Error('Código OTP inválido');
    }

    if (isOtpExpired(otpRecord.expiresAt)) {
      throw new Error('El código OTP ha expirado');
    }

    // Marcar OTP como usado
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Verificar usuario
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    // Generar tokens
    const accessToken = generateAccessToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Guardar refresh token
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        planType: user.planType,
        freeReportsUsed: user.freeReportsUsed,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login
   */
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    if (!user.isVerified) {
      throw new Error('Usuario no verificado. Por favor verifica tu email.');
    }

    if (!user.isActive) {
      throw new Error('Usuario desactivado. Contacta al administrador.');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generar tokens
    const accessToken = generateAccessToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Guardar refresh token
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        planType: user.planType,
        freeReportsUsed: user.freeReportsUsed,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Reenviar OTP
   */
  async resendOtp(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.isVerified) {
      throw new Error('El usuario ya está verificado');
    }

    // Generar nuevo OTP
    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + config.otp.expirationMinutes * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        userId: user.id,
        code: otpCode,
        expiresAt,
      },
    });

    // Enviar email
    await sendOtpEmail(email, otpCode);

    return { message: 'Nuevo código OTP enviado' };
  }

  /**
   * Obtener información del usuario actual
   */
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        planType: true,
        freeReportsUsed: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Solicitar recuperación de contraseña
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Siempre responder con el mismo mensaje para no revelar si el email existe
    if (!user || !user.isVerified || !user.isActive) {
      return { message: 'Si el email existe, recibirás un código de recuperación.' };
    }

    // Invalidar OTPs de recuperación anteriores
    await prisma.otpCode.updateMany({
      where: { userId: user.id, type: 'PASSWORD_RESET', used: false },
      data: { used: true },
    });

    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + config.otp.expirationMinutes * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        userId: user.id,
        code: otpCode,
        type: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    await sendPasswordResetEmail(email, otpCode);

    return { message: 'Si el email existe, recibirás un código de recuperación.' };
  }

  /**
   * Restablecer contraseña con código OTP
   */
  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error('Código inválido o expirado');
    }

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        code,
        type: 'PASSWORD_RESET',
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new Error('Código inválido o expirado');
    }

    if (isOtpExpired(otpRecord.expiresAt)) {
      throw new Error('El código ha expirado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      // Invalidar todas las sesiones activas
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    return { message: 'Contraseña actualizada correctamente. Inicia sesión.' };
  }

  /**
   * Logout (invalidar refresh token)
   */
  async logout(refreshToken: string) {
    await prisma.session.deleteMany({
      where: { refreshToken },
    });

    return { message: 'Sesión cerrada exitosamente' };
  }
}
