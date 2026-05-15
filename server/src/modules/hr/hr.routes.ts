import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import HrController from './hr.controller';

const router = Router();
router.use(autenticar);

router.post('/empleados', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => HrController.crearEmpleado(req, res, next));
router.get('/empleados', (req, res, next) => HrController.listarEmpleados(req, res, next));
router.get('/empleados/:id', (req, res, next) => HrController.obtenerEmpleado(req, res, next));
router.put('/empleados/:id', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => HrController.actualizarEmpleado(req, res, next));
router.put('/empleados/:id/desvincular', autorizar('super_admin', 'admin'), (req, res, next) => HrController.desvincularEmpleado(req, res, next));

router.post('/asistencias', (req, res, next) => HrController.registrarAsistencia(req, res, next));
router.post('/asistencias/qr', (req, res, next) => HrController.registrarPorQR(req, res, next));
router.get('/asistencias/:empleado_id', (req, res, next) => HrController.historialAsistencias(req, res, next));
router.get('/asistencias-resumen', (req, res, next) => HrController.resumenAsistencias(req, res, next));

router.get('/comisiones/calcular', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => HrController.calcularComisiones(req, res, next));
router.get('/comisiones', (req, res, next) => HrController.listarComisiones(req, res, next));
router.put('/comisiones/pagar', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => HrController.pagarComisiones(req, res, next));

export default router;
