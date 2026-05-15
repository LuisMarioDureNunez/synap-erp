import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import DatabaseConnection from './config/database';
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
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }));

    this.app.use(securityHeaders);

    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Negocio-ID'],
      credentials: true,
    }));

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    this.app.use(compression());
    this.app.use(morgan('dev'));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use((req: any, _res: any, next: any) => {
      req.requestId = uuidv4();
      next();
    });
  }

  private async configurarRutas(): Promise<void> {
    this.app.get('/api/health', (_req: any, res: any) => {
      res.json({
        success: true,
        data: {
          sistema: 'SYNAP',
          version: '2.0.0',
          autor: 'Luis Mario Taboada Nunez LMTN',
          modulos: ['auth','pos','inventory','crm','finance','hr','scheduling','delivery','ecommerce','bi','security'],
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      });
    });

    const authRoutes = (await import('./modules/auth/auth.routes')).default;
    const posRoutes = (await import('./modules/pos/pos.routes')).default;
    const inventoryRoutes = (await import('./modules/inventory/inventory.routes')).default;
    const crmRoutes = (await import('./modules/crm/crm.routes')).default;
    const financeRoutes = (await import('./modules/finance/finance.routes')).default;
    const hrRoutes = (await import('./modules/hr/hr.routes')).default;
    const schedulingRoutes = (await import('./modules/scheduling/scheduling.routes')).default;
    const deliveryRoutes = (await import('./modules/delivery/delivery.routes')).default;
    const ecommerceRoutes = (await import('./modules/ecommerce/ecommerce.routes')).default;
    const biRoutes = (await import('./modules/bi/bi.routes')).default;
    const securityRoutes = (await import('./modules/security/security.routes')).default;

    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/pos', posRoutes);
    this.app.use('/api/inventory', inventoryRoutes);
    this.app.use('/api/crm', crmRoutes);
    this.app.use('/api/finance', financeRoutes);
    this.app.use('/api/hr', hrRoutes);
    this.app.use('/api/scheduling', schedulingRoutes);
    this.app.use('/api/delivery', deliveryRoutes);
    this.app.use('/api/ecommerce', ecommerceRoutes);
    this.app.use('/api/bi', biRoutes);
    this.app.use('/api/security', securityRoutes);
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
        console.log('SYNAP v2.0 - SISTEMA COMPLETO');
        console.log('Autor: Luis Mario Taboada Nunez LMTN');
        console.log('Servidor: http://' + this.host + ':' + this.port);
        console.log('11 modulos activos');
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
