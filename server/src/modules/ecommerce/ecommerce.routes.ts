import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import EcommerceController from './ecommerce.controller';

const router = Router();

router.get('/catalogo', async (req: any, res: any, next: any) => {
  try {
    const TiendaService = (await import('./services/tienda.service')).default;
    const catalogo = await TiendaService.obtenerCatalogoOnline(
      req.headers['x-negocio-id'] as string || '00000000-0000-0000-0000-000000000001',
      req.query as any
    );
    res.json({ success: true, ...catalogo, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.post('/pedidos', async (req: any, res: any, next: any) => {
  try {
    const TiendaService = (await import('./services/tienda.service')).default;
    const pedido = await TiendaService.crearPedidoOnline({
      ...req.body,
      negocio_id: req.headers['x-negocio-id'] as string || '00000000-0000-0000-0000-000000000001'
    });
    res.status(201).json({ success: true, data: pedido, timestamp: new Date().toISOString() });
  } catch (error) { next(error); }
});

router.use(autenticar);

router.put('/configurar', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => EcommerceController.configurarTienda(req, res, next));
router.get('/config', (req, res, next) => EcommerceController.obtenerConfigTienda(req, res, next));
router.get('/catalogo-admin', (req, res, next) => EcommerceController.obtenerCatalogo(req, res, next));
router.get('/pedidos-online', (req, res, next) => EcommerceController.listarPedidosOnline(req, res, next));
router.put('/pedidos-online/:id/estado', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => EcommerceController.actualizarEstadoPedido(req, res, next));

export default router;
