// ============================================
// SYNAP - RUTAS DEL MODULO CRM
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import CrmController from './crm.controller';

const router = Router();
router.use(autenticar);

router.post('/clientes', autorizar('super_admin', 'admin', 'gerente', 'cajero'), CrmController.crearCliente);
router.get('/clientes', CrmController.listarClientes);
router.get('/clientes/segmentar', autorizar('super_admin', 'admin', 'gerente'), CrmController.segmentarClientes);
router.get('/clientes/cumpleaneros', CrmController.cumpleaneros);
router.get('/clientes/:id', CrmController.obtenerCliente);
router.put('/clientes/:id', autorizar('super_admin', 'admin', 'gerente'), CrmController.actualizarCliente);

router.post('/fiados', autorizar('super_admin', 'admin', 'gerente'), CrmController.crearFiado);
router.post('/fiados/pago', autorizar('super_admin', 'admin', 'gerente', 'cajero'), CrmController.registrarPago);
router.get('/fiados', CrmController.listarFiados);
router.get('/fiados/resumen', CrmController.resumenFiados);
router.get('/fiados/:id/pagos', CrmController.obtenerPagosFiado);

router.post('/puntos/configurar', autorizar('super_admin', 'admin', 'gerente'), CrmController.configurarPuntos);
router.post('/puntos/canjear', autorizar('super_admin', 'admin', 'gerente', 'cajero'), CrmController.canjearPuntos);
router.get('/puntos/historial/:cliente_id', CrmController.historialPuntos);
router.get('/puntos/ranking', CrmController.rankingPuntos);

export default router;
