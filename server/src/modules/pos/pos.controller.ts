// ============================================
// SYNAP - CONTROLADOR POS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ENDPOINTS COMPLETOS PARA EL PUNTO DE VENTA
// ============================================

import { Request, Response, NextFunction } from 'express';
import ProductoService from './services/producto.service';
import VentaService from './services/venta.service';
import { IRespuestaAPI } from '../../types';

class PosController {

  crearProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const producto = await ProductoService.crear({
        ...req.body,
        negocio_id: req.usuario!.negocio_id
      });
      res.status(201).json({
        success: true,
        data: producto,
        message: 'Producto creado exitosamente',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  actualizarProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const producto = await ProductoService.actualizar({
        ...req.body,
        id: req.params.id
      });
      res.json({
        success: true,
        data: producto,
        message: 'Producto actualizado exitosamente',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  obtenerProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const producto = await ProductoService.obtenerPorId(req.params.id, req.usuario!.negocio_id);
      res.json({
        success: true,
        data: producto,
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  buscarProductos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await ProductoService.buscar({
        negocio_id: req.usuario!.negocio_id,
        ...req.query as any
      });
      res.json({
        success: true,
        ...resultado,
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  eliminarProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await ProductoService.eliminar(req.params.id, req.usuario!.negocio_id);
      res.json({
        success: true,
        data: resultado,
        message: 'Producto eliminado exitosamente',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  productosMasVendidos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dias = '30', limite = '10' } = req.query;
      const productos = await ProductoService.productosMasVendidos(
        req.usuario!.negocio_id,
        parseInt(dias as string),
        parseInt(limite as string)
      );
      res.json({
        success: true,
        data: productos,
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  crearVenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const venta = await VentaService.crear({
        ...req.body,
        negocio_id: req.usuario!.negocio_id,
        usuario_id: req.usuario!.id
      });
      res.status(201).json({
        success: true,
        data: venta,
        message: 'Venta registrada exitosamente',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  obtenerVenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const venta = await VentaService.obtenerPorId(req.params.id, req.usuario!.negocio_id);
      res.json({
        success: true,
        data: venta,
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  listarVentas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await VentaService.listar({
        negocio_id: req.usuario!.negocio_id,
        ...req.query as any
      });
      res.json({
        success: true,
        ...resultado,
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  anularVenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { motivo } = req.body;
      if (!motivo) {
        res.status(400).json({
          success: false,
          error: 'El motivo de anulacion es requerido',
          timestamp: new Date().toISOString(),
        } as IRespuestaAPI);
        return;
      }

      const resultado = await VentaService.anular(
        req.params.id,
        req.usuario!.negocio_id,
        req.usuario!.id,
        motivo
      );

      res.json({
        success: true,
        data: resultado,
        message: 'Venta anulada exitosamente',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  resumenDia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resumen = await VentaService.resumenDia(
        req.usuario!.negocio_id,
        req.query.sucursal_id as string
      );
      res.json({
        success: true,
        data: resumen,
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };
}

export default new PosController();
