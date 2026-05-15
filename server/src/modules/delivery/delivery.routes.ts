// ============================================
// SYNAP - RUTAS DEL MODULO DELIVERY
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import DeliveryController from './delivery.controller';

const router = Router();
router.use(autenticar);

router.post('/zonas', autorizar('super_admin', 'admin', 'gerente'), DeliveryController.crearZona);
router.get('/zonas', DeliveryController.listarZonas);
router.put('/zonas/:id', autorizar('super_admin', 'admin', 'gerente'), DeliveryController.actualizarZona);

router.post('/repartidores', autorizar('super_admin', 'admin', 'gerente'), DeliveryController.crearRepartidor);
router.get('/repartidores', DeliveryController.listarRepartidores);
router.put('/repartidores/:id', autorizar('super_admin', 'admin', 'gerente'), DeliveryController.actualizarRepartidor);

router.post('/pedidos', DeliveryController.crearPedido);
router.put('/pedidos/asignar', autorizar('super_admin', 'admin', 'gerente'), DeliveryController.asignarRepartidor);
router.put('/pedidos/:id/estado', DeliveryController.actualizarEstado);
router.get('/pedidos', DeliveryController.listarPedidos);
router.get('/pedidos/:id/tracking', DeliveryController.trackingPedido);
router.get('/resumen', DeliveryController.resumenDelivery);

export default router;
