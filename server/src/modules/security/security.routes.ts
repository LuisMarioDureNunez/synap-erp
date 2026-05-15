// ============================================
// SYNAP - RUTAS DE SEGURIDAD
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import { autenticar, autorizar } from '../../../middleware/auth.middleware';
import SecurityController from './security.controller';

const router = Router();
router.use(autenticar);

router.post('/2fa/configurar', SecurityController.configurar2FA);
router.post('/2fa/verificar', SecurityController.verificar2FA);
router.post('/2fa/desactivar', SecurityController.desactivar2FA);

router.get('/auditoria', autorizar('super_admin', 'admin'), SecurityController.auditoria);
router.get('/resumen', autorizar('super_admin', 'admin'), SecurityController.resumenSeguridad);

router.post('/bloquear-ip', autorizar('super_admin', 'admin'), SecurityController.bloquearIP);
router.post('/desbloquear-ip', autorizar('super_admin', 'admin'), SecurityController.desbloquearIP);

router.post('/respaldo', autorizar('super_admin', 'admin'), SecurityController.generarRespaldo);
router.get('/salud', autorizar('super_admin', 'admin'), SecurityController.monitoreoSalud);

export default router;
