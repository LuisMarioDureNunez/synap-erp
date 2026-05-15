import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import InventoryController from './inventory.controller';

const router = Router();
router.use(autenticar);

router.post('/proveedores', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => InventoryController.crearProveedor(req, res, next));
router.get('/proveedores/:id', (req, res, next) => InventoryController.obtenerProveedor(req, res, next));
router.get('/proveedores', (req, res, next) => InventoryController.listarProveedores(req, res, next));
router.put('/proveedores/:id', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => InventoryController.actualizarProveedor(req, res, next));
router.delete('/proveedores/:id', autorizar('super_admin', 'admin'), (req, res, next) => InventoryController.eliminarProveedor(req, res, next));

router.post('/compras', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => InventoryController.crearCompra(req, res, next));
router.get('/compras/:id', (req, res, next) => InventoryController.obtenerCompra(req, res, next));
router.get('/compras', (req, res, next) => InventoryController.listarCompras(req, res, next));
router.get('/resumen-compras', (req, res, next) => InventoryController.resumenCompras(req, res, next));

router.get('/stock', (req, res, next) => InventoryController.obtenerStock(req, res, next));
router.get('/agotados', (req, res, next) => InventoryController.productosAgotados(req, res, next));
router.get('/por-vencer', (req, res, next) => InventoryController.productosPorVencer(req, res, next));
router.get('/vencidos', (req, res, next) => InventoryController.productosVencidos(req, res, next));
router.get('/alertas', (req, res, next) => InventoryController.alertasAutomaticas(req, res, next));

router.post('/conteo/iniciar', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => InventoryController.iniciarConteo(req, res, next));
router.post('/conteo/registrar', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => InventoryController.registrarConteo(req, res, next));
router.get('/movimientos/:producto_id', (req, res, next) => InventoryController.movimientosStock(req, res, next));
router.get('/valoracion', (req, res, next) => InventoryController.valoracionInventario(req, res, next));

export default router;
