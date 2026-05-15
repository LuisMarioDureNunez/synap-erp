// ============================================
// SYNAP - RUTAS DEL MODULO AGENDA
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import SchedulingController from './scheduling.controller';

const router = Router();
router.use(autenticar);

router.post('/servicios', autorizar('super_admin', 'admin', 'gerente'), SchedulingController.crearServicio);
router.get('/servicios', SchedulingController.listarServicios);

router.post('/citas', SchedulingController.crearCita);
router.get('/citas', SchedulingController.listarCitas);
router.get('/citas/del-dia', SchedulingController.citasDelDia);
router.get('/agenda-semanal', SchedulingController.agendaSemanal);
router.put('/citas/:id/estado', SchedulingController.actualizarEstadoCita);

export default router;
