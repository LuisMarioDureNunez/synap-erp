// ============================================
// SYNAP - SERVIDOR PRINCIPAL v1.3
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import DatabaseConnection from './config/database';
import authRoutes from './modules/auth/auth.routes';
import posRoutes from './modules/pos/pos.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import crmRoutes from './modules/crm/crm.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { securityHeaders } from './middleware/security.middleware';

dotenv.config();

class SynapServer {
  public app: express.Application;
  private port: number;
  private host: string;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '4000');
    this.host = process.env.HOST || '0.0.0.0';
    this.configurarMiddlewares();
    this.configurarRutas();
    this.configurarManejadoresErrores();
  }

  private configurarMiddlewares(): void {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-origin" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true,
    }));

    this.app.use(securityHeaders);

    const corsOptions = {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Negocio-ID'],
      exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      credentials: true,
      maxAge: 86400,
    };
    this.app.use(cors(corsOptions));

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Demasiadas solicitudes.', timestamp: new Date().toISOString() },
      keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
    });
    this.app.use('/api/', limiter);

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: { success: false, error: 'Demasiados intentos de autenticacion.', timestamp: new Date().toISOString() },
    });
    this.app.use('/api/auth/login', authLimiter);

    this.app.use(compression({ level: 6, threshold: 1024 }));
    this.app.use(morgan(':method :url :status :response-time ms'));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use((req, res, next) => {
      req.requestId = uuidv4();
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });
  }

  private configurarRutas(): void {
    this.app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        data: {
          sistema: 'SYNAP',
          version: '1.0.0',
          autor: 'Luis Mario Taboada Nunez LMTN',
          modulos: ['auth', 'pos', 'inventory', 'crm'],
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      });
    });

    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/pos', posRoutes);
    this.app.use('/api/inventory', inventoryRoutes);
    this.app.use('/api/crm', crmRoutes);
  }

  private configurarManejadoresErrores(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      DatabaseConnection.getInstance();
      console.log('SYNAP: Base de datos conectada');
      this.app.listen(this.port, this.host, () => {
        console.log('========================================');
        console.log('SYNAP - SISTEMA DE NEGOCIOS AUTOMATIZADO');
        console.log('Autor: Luis Mario Taboada Nunez LMTN');
        console.log(`Servidor: http://${this.host}:${this.port}`);
        console.log('Modulos: auth, pos, inventory, crm');
        console.log('========================================');
      });
    } catch (error) {
      console.error('SYNAP ERROR:', error);
      process.exit(1);
    }
  }
}

const servidor = new SynapServer();
servidor.start();
export default SynapServer;
