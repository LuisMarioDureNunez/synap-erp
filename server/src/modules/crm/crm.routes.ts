import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import CrmController from './crm.controller';

const router = Router();
router.use(autenticar);

router.post('/clientes', autorizar('super_admin', 'admin', 'gerente', 'cajero'), (req, res, next) => CrmController.crearCliente(req, res, next));
router.get('/clientes', (req, res, next) => CrmController.listarClientes(req, res, next));
router.get('/clientes/segmentar', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => CrmController.segmentarClientes(req, res, next));
router.get('/clientes/cumpleaneros', (req, res, next) => CrmController.cumpleaneros(req, res, next));
router.get('/clientes/:id', (req, res, next) => CrmController.obtenerCliente(req, res, next));
router.put('/clientes/:id', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => CrmController.actualizarCliente(req, res, next));

router.post('/fiados', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => CrmController.crearFiado(req, res, next));
router.post('/fiados/pago', autorizar('super_admin', 'admin', 'gerente', 'cajero'), (req, res, next) => CrmController.registrarPago(req, res, next));
router.get('/fiados', (req, res, next) => CrmController.listarFiados(req, res, next));
router.get('/fiados/resumen', (req, res, next) => CrmController.resumenFiados(req, res, next));
router.get('/fiados/:id/pagos', (req, res, next) => CrmController.obtenerPagosFiado(req, res, next));

router.post('/puntos/configurar', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => CrmController.configurarPuntos(req, res, next));
router.post('/puntos/canjear', autorizar('super_admin', 'admin', 'gerente', 'cajero'), (req, res, next) => CrmController.canjearPuntos(req, res, next));
router.get('/puntos/historial/:cliente_id', (req, res, next) => CrmController.historialPuntos(req, res, next));
router.get('/puntos/ranking', (req, res, next) => CrmController.rankingPuntos(req, res, next));

export default router;
