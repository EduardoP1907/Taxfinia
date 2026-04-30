import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno ANTES de cualquier otra cosa
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import financialRoutes from './routes/financial.routes';
import ratiosRoutes from './routes/ratios.routes';
import projectionsRoutes from './routes/projections.routes';
import reportRoutes from './routes/report.routes';
import chatRoutes from './routes/chat.routes';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: ['http://localhost:5177', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://taxfinia-frontend.s3-website-us-east-1.amazonaws.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiters for auth endpoints (brute force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Demasiados intentos de acceso. Espera 15 minutos antes de intentar de nuevo.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiadas solicitudes de código. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Demasiadas solicitudes de recuperación de contraseña. Espera 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters before auth routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/resend-otp', otpLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'PROMETHEIA API v1.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/ratios', ratiosRoutes);
app.use('/api/projections', projectionsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatRoutes);

// Manejo de errores global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Ruta 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   🔥 PROMETHEIA API Server           ║
║   Puerto: ${PORT}                       ║
║   Entorno: ${config.nodeEnv}              ║
║   Frontend: ${config.frontendUrl}        ║
╚═══════════════════════════════════════╝
  `);
});

export default app;
