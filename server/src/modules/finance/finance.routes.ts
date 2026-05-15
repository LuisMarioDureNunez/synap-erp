// ============================================
// SYNAP - RUTAS DEL MODULO FINANZAS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import FinanceController from './finance.controller';

const router = Router();
router.use(autenticar);

router.post('/caja/abrir', autorizar('super_admin', 'admin', 'gerente', 'cajero'), FinanceController.abrirCaja);
router.post('/caja/cerrar', autorizar('super_admin', 'admin', 'gerente', 'cajero'), FinanceController.cerrarCaja);
router.get('/caja/actual', FinanceController.cajaActual);
router.get('/caja/historial', FinanceController.historialCajas);

router.post('/cuentas', autorizar('super_admin', 'admin', 'gerente'), FinanceController.crearCuenta);
router.get('/cuentas', FinanceController.listarCuentas);
router.post('/transacciones', autorizar('super_admin', 'admin', 'gerente'), FinanceController.registrarTransaccion);

router.post('/gastos', FinanceController.registrarGasto);
router.get('/gastos', FinanceController.listarGastos);

router.get('/resumen', FinanceController.resumenFinanciero);
router.get('/flujo-caja', FinanceController.flujoCaja);

router.get('/reportes/ventas/pdf', autorizar('super_admin', 'admin', 'gerente'), FinanceController.reporteVentasPDF);
router.get('/reportes/ventas/excel', autorizar('super_admin', 'admin', 'gerente'), FinanceController.reporteVentasExcel);
router.get('/reportes/balance/pdf', autorizar('super_admin', 'admin', 'gerente'), FinanceController.balanceGeneralPDF);

export default router;
