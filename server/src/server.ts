const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const DatabaseConnection = require('./config/database').default;
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { securityHeaders } = require('./middleware/security.middleware');

dotenv.config();

class SynapServer {
  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '4000');
    this.host = process.env.HOST || '0.0.0.0';
    this.configurarMiddlewares();
    this.configurarRutas();
    this.configurarManejadoresErrores();
  }

  configurarMiddlewares() {
    this.app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
    this.app.use(securityHeaders);
    this.app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Negocio-ID'], credentials: true }));
    this.app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));
    this.app.use(compression());
    this.app.use(morgan('dev'));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use((req, _res, next) => { req.requestId = uuidv4(); next(); });
  }

  async configurarRutas() {
    this.app.get('/api/health', (_req, res) => {
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

    const authRoutes = require('./modules/auth/auth.routes').default;
    const posRoutes = require('./modules/pos/pos.routes').default;
    const inventoryRoutes = require('./modules/inventory/inventory.routes').default;
    const crmRoutes = require('./modules/crm/crm.routes').default;
    const financeRoutes = require('./modules/finance/finance.routes').default;
    const hrRoutes = require('./modules/hr/hr.routes').default;
    const schedulingRoutes = require('./modules/scheduling/scheduling.routes').default;
    const deliveryRoutes = require('./modules/delivery/delivery.routes').default;
    const ecommerceRoutes = require('./modules/ecommerce/ecommerce.routes').default;
    const biRoutes = require('./modules/bi/bi.routes').default;
    const securityRoutes = require('./modules/security/security.routes').default;

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

  configurarManejadoresErrores() {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  async start() {
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
    }
  }
}

const servidor = new SynapServer();
servidor.start();

module.exports = SynapServer;
