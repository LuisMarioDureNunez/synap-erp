import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import SecurityController from './security.controller';

const router = Router();
router.use(autenticar);

router.post('/2fa/configurar', (req, res, next) => SecurityController.configurar2FA(req, res, next));
router.post('/2fa/verificar', (req, res, next) => SecurityController.verificar2FA(req, res, next));
router.post('/2fa/desactivar', (req, res, next) => SecurityController.desactivar2FA(req, res, next));

router.get('/auditoria', autorizar('super_admin', 'admin'), (req, res, next) => SecurityController.auditoria(req, res, next));
router.get('/resumen', autorizar('super_admin', 'admin'), (req, res, next) => SecurityController.resumenSeguridad(req, res, next));

router.post('/bloquear-ip', autorizar('super_admin', 'admin'), (req, res, next) => SecurityController.bloquearIP(req, res, next));
router.post('/desbloquear-ip', autorizar('super_admin', 'admin'), (req, res, next) => SecurityController.desbloquearIP(req, res, next));

router.post('/respaldo', autorizar('super_admin', 'admin'), (req, res, next) => SecurityController.generarRespaldo(req, res, next));
router.get('/salud', autorizar('super_admin', 'admin'), (req, res, next) => SecurityController.monitoreoSalud(req, res, next));

export default router;
