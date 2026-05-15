// ============================================
// SYNAP - RUTAS DEL MODULO INVENTARIO
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import InventoryController from './inventory.controller';

const router = Router();
router.use(autenticar);

router.post('/proveedores', autorizar('super_admin', 'admin', 'gerente'), InventoryController.crearProveedor);
router.get('/proveedores/:id', InventoryController.obtenerProveedor);
router.get('/proveedores', InventoryController.listarProveedores);
router.put('/proveedores/:id', autorizar('super_admin', 'admin', 'gerente'), InventoryController.actualizarProveedor);
router.delete('/proveedores/:id', autorizar('super_admin', 'admin'), InventoryController.eliminarProveedor);

router.post('/compras', autorizar('super_admin', 'admin', 'gerente'), InventoryController.crearCompra);
router.get('/compras/:id', InventoryController.obtenerCompra);
router.get('/compras', InventoryController.listarCompras);
router.get('/resumen-compras', InventoryController.resumenCompras);

router.get('/stock', InventoryController.obtenerStock);
router.get('/agotados', InventoryController.productosAgotados);
router.get('/por-vencer', InventoryController.productosPorVencer);
router.get('/vencidos', InventoryController.productosVencidos);
router.get('/alertas', InventoryController.alertasAutomaticas);

router.post('/conteo/iniciar', autorizar('super_admin', 'admin', 'gerente'), InventoryController.iniciarConteo);
router.post('/conteo/registrar', autorizar('super_admin', 'admin', 'gerente'), InventoryController.registrarConteo);
router.get('/movimientos/:producto_id', InventoryController.movimientosStock);
router.get('/valoracion', InventoryController.valoracionInventario);

export default router;
