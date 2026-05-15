import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import BIController from './bi.controller';

const router = Router();
router.use(autenticar);

router.get('/metricas-diarias', (req, res, next) => BIController.metricasDiarias(req, res, next));
router.get('/tendencias', (req, res, next) => BIController.tendenciasVentas(req, res, next));
router.get('/dashboard', (req, res, next) => BIController.dashboardGeneral(req, res, next));
router.get('/comparativa-mensual', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => BIController.comparativaMensual(req, res, next));
router.get('/predecir-ventas', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => BIController.predecirVentas(req, res, next));
router.get('/detectar-anomalias', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => BIController.detectarAnomalias(req, res, next));
router.get('/recomendaciones', (req, res, next) => BIController.recomendacionesInteligentes(req, res, next));

export default router;
