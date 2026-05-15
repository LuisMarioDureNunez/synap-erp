// ============================================
// SYNAP - RUTAS COMPLETAS DEL MODULO POS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import PosController from './pos.controller';

const router = Router();
router.use(autenticar);

router.post('/productos', autorizar('super_admin', 'admin', 'gerente'), PosController.crearProducto);
router.put('/productos/:id', autorizar('super_admin', 'admin', 'gerente'), PosController.actualizarProducto);
router.get('/productos/:id', PosController.obtenerProducto);
router.get('/productos', PosController.buscarProductos);
router.delete('/productos/:id', autorizar('super_admin', 'admin'), PosController.eliminarProducto);
router.get('/productos-mas-vendidos', PosController.productosMasVendidos);

router.post('/ventas', autorizar('super_admin', 'admin', 'gerente', 'cajero', 'vendedor'), PosController.crearVenta);
router.get('/ventas', PosController.listarVentas);
router.get('/ventas/:id', PosController.obtenerVenta);
router.put('/ventas/:id/anular', autorizar('super_admin', 'admin', 'gerente'), PosController.anularVenta);
router.get('/resumen-dia', PosController.resumenDia);

export default router;
