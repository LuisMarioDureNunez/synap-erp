// ============================================
// SYNAP - CONTROLADOR DE E-COMMERCE
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Request, Response, NextFunction } from 'express';
import TiendaService from './services/tienda.service';
import { IRespuestaAPI } from '../../types';

class EcommerceController {

  configurarTienda = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = await TiendaService.configurarTienda({ ...req.body, negocio_id: req.usuario!.negocio_id });
      res.json({ success: true, data: config, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  obtenerConfigTienda = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = await TiendaService.obtenerConfigTienda(req.usuario!.negocio_id);
      res.json({ success: true, data: config, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  obtenerCatalogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const catalogo = await TiendaService.obtenerCatalogoOnline(req.usuario!.negocio_id, req.query as any);
      res.json({ success: true, ...catalogo, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  crearPedidoOnline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pedido = await TiendaService.crearPedidoOnline({ ...req.body, negocio_id: req.usuario!.negocio_id });
      res.status(201).json({ success: true, data: pedido, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarPedidosOnline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await TiendaService.listarPedidosOnline({ negocio_id: req.usuario!.negocio_id, ...req.query as any });
      res.json({ success: true, ...resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  actualizarEstadoPedido = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estado } = req.body;
      const pedido = await TiendaService.actualizarEstadoPedidoOnline(req.params.id, estado, req.usuario!.negocio_id);
      res.json({ success: true, data: pedido, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };
}

export default new EcommerceController();
