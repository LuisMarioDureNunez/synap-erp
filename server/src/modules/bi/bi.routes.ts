// ============================================
// SYNAP - RUTAS DE BUSINESS INTELLIGENCE E IA
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import { autenticar, autorizar } from '../../../middleware/auth.middleware';
import BIController from './bi.controller';

const router = Router();
router.use(autenticar);

router.get('/metricas-diarias', BIController.metricasDiarias);
router.get('/tendencias', BIController.tendenciasVentas);
router.get('/dashboard', BIController.dashboardGeneral);
router.get('/comparativa-mensual', autorizar('super_admin', 'admin', 'gerente'), BIController.comparativaMensual);
router.get('/predecir-ventas', autorizar('super_admin', 'admin', 'gerente'), BIController.predecirVentas);
router.get('/detectar-anomalias', autorizar('super_admin', 'admin', 'gerente'), BIController.detectarAnomalias);
router.get('/recomendaciones', BIController.recomendacionesInteligentes);

export default router;
