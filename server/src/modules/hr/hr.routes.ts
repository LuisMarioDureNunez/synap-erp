// ============================================
// SYNAP - RUTAS DEL MODULO RRHH
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import HrController from './hr.controller';

const router = Router();
router.use(autenticar);

router.post('/empleados', autorizar('super_admin', 'admin', 'gerente'), HrController.crearEmpleado);
router.get('/empleados', HrController.listarEmpleados);
router.get('/empleados/:id', HrController.obtenerEmpleado);
router.put('/empleados/:id', autorizar('super_admin', 'admin', 'gerente'), HrController.actualizarEmpleado);
router.put('/empleados/:id/desvincular', autorizar('super_admin', 'admin'), HrController.desvincularEmpleado);

router.post('/asistencias', HrController.registrarAsistencia);
router.post('/asistencias/qr', HrController.registrarPorQR);
router.get('/asistencias/:empleado_id', HrController.historialAsistencias);
router.get('/asistencias-resumen', HrController.resumenAsistencias);

router.get('/comisiones/calcular', autorizar('super_admin', 'admin', 'gerente'), HrController.calcularComisiones);
router.get('/comisiones', HrController.listarComisiones);
router.put('/comisiones/pagar', autorizar('super_admin', 'admin', 'gerente'), HrController.pagarComisiones);

export default router;
