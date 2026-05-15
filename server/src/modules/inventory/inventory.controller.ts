// ============================================
// SYNAP - CONTROLADOR DE INVENTARIO
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Request, Response, NextFunction } from 'express';
import ProveedorService from './services/proveedor.service';
import CompraService from './services/compra.service';
import InventarioService from './services/inventario.service';
import { IRespuestaAPI } from '../../types';

class InventoryController {

  crearProveedor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const proveedor = await ProveedorService.crear({
        ...req.body,
        negocio_id: req.usuario!.negocio_id
      });
      res.status(201).json({ success: true, data: proveedor, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  obtenerProveedor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const proveedor = await ProveedorService.obtenerPorId(req.params.id, req.usuario!.negocio_id);
      res.json({ success: true, data: proveedor, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarProveedores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const proveedores = await ProveedorService.listar(req.usuario!.negocio_id, req.query.busqueda as string);
      res.json({ success: true, data: proveedores, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  actualizarProveedor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const proveedor = await ProveedorService.actualizar(req.params.id, req.usuario!.negocio_id, req.body);
      res.json({ success: true, data: proveedor, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  eliminarProveedor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await ProveedorService.eliminar(req.params.id, req.usuario!.negocio_id);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  crearCompra = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const compra = await CompraService.crear({
        ...req.body,
        negocio_id: req.usuario!.negocio_id,
        usuario_id: req.usuario!.id
      });
      res.status(201).json({ success: true, data: compra, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  obtenerCompra = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const compra = await CompraService.obtenerPorId(req.params.id, req.usuario!.negocio_id);
      res.json({ success: true, data: compra, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarCompras = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await CompraService.listar({
        negocio_id: req.usuario!.negocio_id,
        ...req.query as any
      });
      res.json({ success: true, ...resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  resumenCompras = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resumen = await CompraService.resumenCompras(
        req.usuario!.negocio_id,
        parseInt(req.query.dias as string) || 30
      );
      res.json({ success: true, data: resumen, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  obtenerStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stock = await InventarioService.obtenerStock(req.usuario!.negocio_id, req.query as any);
      res.json({ success: true, data: stock, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  productosAgotados = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await InventarioService.obtenerProductosAgotados(req.usuario!.negocio_id);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  productosPorVencer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await InventarioService.productosPorVencer(
        req.usuario!.negocio_id,
        parseInt(req.query.dias as string) || 30
      );
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  productosVencidos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await InventarioService.productosVencidos(req.usuario!.negocio_id);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  alertasAutomaticas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const alertas = await InventarioService.alertasAutomaticas(req.usuario!.negocio_id);
      res.json({ success: true, data: alertas, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  iniciarConteo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conteo = await InventarioService.iniciarConteoFisico(
        req.usuario!.negocio_id,
        req.usuario!.id,
        req.body.sucursal_id
      );
      res.json({ success: true, data: conteo, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  registrarConteo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { producto_id, cantidad_real, observaciones } = req.body;
      const resultado = await InventarioService.registrarConteoProducto(
        producto_id, cantidad_real, req.usuario!.id, req.usuario!.negocio_id, observaciones
      );
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  movimientosStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const movimientos = await InventarioService.movimientosStock(
        req.params.producto_id,
        req.usuario!.negocio_id,
        parseInt(req.query.limite as string) || 50
      );
      res.json({ success: true, data: movimientos, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  valoracionInventario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const valoracion = await InventarioService.valoracionInventario(req.usuario!.negocio_id);
      res.json({ success: true, data: valoracion, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };
}

export default new InventoryController();
