// ============================================
// SYNAP - RUTAS DEL MODULO E-COMMERCE
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import EcommerceController from './ecommerce.controller';

const router = Router();

router.get('/catalogo', async (req, res, next) => {
  const { default: TiendaService } = await import('./services/tienda.service');
  try {
    const catalogo = await TiendaService.obtenerCatalogoOnline(
      req.headers['x-negocio-id'] as string || '00000000-0000-0000-0000-000000000001',
      req.query as any
    );
    res.json({ success: true, ...catalogo, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.post('/pedidos', async (req, res, next) => {
  const { default: TiendaService } = await import('./services/tienda.service');
  try {
    const pedido = await TiendaService.crearPedidoOnline({
      ...req.body,
      negocio_id: req.headers['x-negocio-id'] as string || '00000000-0000-0000-0000-000000000001'
    });
    res.status(201).json({ success: true, data: pedido, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.use(autenticar);

router.put('/configurar', autorizar('super_admin', 'admin', 'gerente'), EcommerceController.configurarTienda);
router.get('/config', EcommerceController.obtenerConfigTienda);
router.get('/catalogo-admin', EcommerceController.obtenerCatalogo);
router.get('/pedidos-online', EcommerceController.listarPedidosOnline);
router.put('/pedidos-online/:id/estado', autorizar('super_admin', 'admin', 'gerente'), EcommerceController.actualizarEstadoPedido);

export default router;
