import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import SchedulingController from './scheduling.controller';

const router = Router();
router.use(autenticar);

router.post('/servicios', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => SchedulingController.crearServicio(req, res, next));
router.get('/servicios', (req, res, next) => SchedulingController.listarServicios(req, res, next));

router.post('/citas', (req, res, next) => SchedulingController.crearCita(req, res, next));
router.get('/citas', (req, res, next) => SchedulingController.listarCitas(req, res, next));
router.get('/citas/del-dia', (req, res, next) => SchedulingController.citasDelDia(req, res, next));
router.get('/agenda-semanal', (req, res, next) => SchedulingController.agendaSemanal(req, res, next));
router.put('/citas/:id/estado', (req, res, next) => SchedulingController.actualizarEstadoCita(req, res, next));

export default router;
