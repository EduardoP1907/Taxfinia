import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { validationResult } from 'express-validator';

const authService = new AuthService();

const isProd = process.env.NODE_ENV === 'production';
// Cookies require HTTPS for cross-origin (SameSite=None). Until HTTPS is configured,
// tokens are also returned in the body so the frontend can use Authorization header as fallback.
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === 'true';

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: HTTPS_ENABLED,
  sameSite: (HTTPS_ENABLED ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: HTTPS_ENABLED,
  sameSite: (HTTPS_ENABLED ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
}

function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
}

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, inviteToken } = req.body;
      const result = await authService.register(email, password, firstName, lastName, inviteToken);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async verifyOtp(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, code } = req.body;
      const result = await authService.verifyOtp(email, code);

      setAuthCookies(res, result.accessToken, result.refreshToken);

      // Also return tokens in body — required for HTTP cross-origin (production without HTTPS)
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const result = await authService.login(email, password);

      setAuthCookies(res, result.accessToken, result.refreshToken);

      // Also return tokens in body — required for HTTP cross-origin (production without HTTPS)
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async resendOtp(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const result = await authService.resendOtp(email);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const user = await authService.getCurrentUser(req.user.userId);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, code, newPassword } = req.body;
      const result = await authService.resetPassword(email, code, newPassword);
      clearAuthCookies(res);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const refreshToken = (req as any).cookies?.refreshToken || req.body?.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      clearAuthCookies(res);
      res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (error: any) {
      clearAuthCookies(res);
      res.json({ message: 'Sesión cerrada exitosamente' });
    }
  }
}
