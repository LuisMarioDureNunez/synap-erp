import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import DeliveryController from './delivery.controller';

const router = Router();
router.use(autenticar);

router.post('/zonas', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => DeliveryController.crearZona(req, res, next));
router.get('/zonas', (req, res, next) => DeliveryController.listarZonas(req, res, next));
router.put('/zonas/:id', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => DeliveryController.actualizarZona(req, res, next));

router.post('/repartidores', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => DeliveryController.crearRepartidor(req, res, next));
router.get('/repartidores', (req, res, next) => DeliveryController.listarRepartidores(req, res, next));
router.put('/repartidores/:id', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => DeliveryController.actualizarRepartidor(req, res, next));

router.post('/pedidos', (req, res, next) => DeliveryController.crearPedido(req, res, next));
router.put('/pedidos/asignar', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => DeliveryController.asignarRepartidor(req, res, next));
router.put('/pedidos/:id/estado', (req, res, next) => DeliveryController.actualizarEstado(req, res, next));
router.get('/pedidos', (req, res, next) => DeliveryController.listarPedidos(req, res, next));
router.get('/pedidos/:id/tracking', (req, res, next) => DeliveryController.trackingPedido(req, res, next));
router.get('/resumen', (req, res, next) => DeliveryController.resumenDelivery(req, res, next));

export default router;
