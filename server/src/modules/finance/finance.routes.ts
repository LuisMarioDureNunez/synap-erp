import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import FinanceController from './finance.controller';

const router = Router();
router.use(autenticar);

router.post('/caja/abrir', autorizar('super_admin', 'admin', 'gerente', 'cajero'), (req, res, next) => FinanceController.abrirCaja(req, res, next));
router.post('/caja/cerrar', autorizar('super_admin', 'admin', 'gerente', 'cajero'), (req, res, next) => FinanceController.cerrarCaja(req, res, next));
router.get('/caja/actual', (req, res, next) => FinanceController.cajaActual(req, res, next));
router.get('/caja/historial', (req, res, next) => FinanceController.historialCajas(req, res, next));

router.post('/cuentas', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => FinanceController.crearCuenta(req, res, next));
router.get('/cuentas', (req, res, next) => FinanceController.listarCuentas(req, res, next));
router.post('/transacciones', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => FinanceController.registrarTransaccion(req, res, next));

router.post('/gastos', (req, res, next) => FinanceController.registrarGasto(req, res, next));
router.get('/gastos', (req, res, next) => FinanceController.listarGastos(req, res, next));

router.get('/resumen', (req, res, next) => FinanceController.resumenFinanciero(req, res, next));
router.get('/flujo-caja', (req, res, next) => FinanceController.flujoCaja(req, res, next));

router.get('/reportes/ventas/pdf', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => FinanceController.reporteVentasPDF(req, res, next));
router.get('/reportes/ventas/excel', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => FinanceController.reporteVentasExcel(req, res, next));
router.get('/reportes/balance/pdf', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => FinanceController.balanceGeneralPDF(req, res, next));

export default router;
