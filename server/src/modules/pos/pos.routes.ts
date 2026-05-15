import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import PosController from './pos.controller';

const router = Router();
router.use(autenticar);

router.post('/productos', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => PosController.crearProducto(req, res, next));
router.put('/productos/:id', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => PosController.actualizarProducto(req, res, next));
router.get('/productos/:id', (req, res, next) => PosController.obtenerProducto(req, res, next));
router.get('/productos', (req, res, next) => PosController.buscarProductos(req, res, next));
router.delete('/productos/:id', autorizar('super_admin', 'admin'), (req, res, next) => PosController.eliminarProducto(req, res, next));
router.get('/productos-mas-vendidos', (req, res, next) => PosController.productosMasVendidos(req, res, next));

router.post('/ventas', autorizar('super_admin', 'admin', 'gerente', 'cajero', 'vendedor'), (req, res, next) => PosController.crearVenta(req, res, next));
router.get('/ventas', (req, res, next) => PosController.listarVentas(req, res, next));
router.get('/ventas/:id', (req, res, next) => PosController.obtenerVenta(req, res, next));
router.put('/ventas/:id/anular', autorizar('super_admin', 'admin', 'gerente'), (req, res, next) => PosController.anularVenta(req, res, next));
router.get('/resumen-dia', (req, res, next) => PosController.resumenDia(req, res, next));

export default router;
