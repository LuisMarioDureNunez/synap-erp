// ============================================
// SYNAP - CONTROLADOR DE DELIVERY
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Request, Response, NextFunction } from 'express';
import DeliveryService from './services/delivery.service';
import PedidoService from './services/pedido.service';
import { IRespuestaAPI } from '../../types';

class DeliveryController {

  crearZona = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const zona = await DeliveryService.crearZona({ ...req.body, negocio_id: req.usuario!.negocio_id });
      res.status(201).json({ success: true, data: zona, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarZonas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const zonas = await DeliveryService.listarZonas(req.usuario!.negocio_id);
      res.json({ success: true, data: zonas, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  actualizarZona = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const zona = await DeliveryService.actualizarZona(req.params.id, req.usuario!.negocio_id, req.body);
      res.json({ success: true, data: zona, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  crearRepartidor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repartidor = await DeliveryService.crearRepartidor({ ...req.body, negocio_id: req.usuario!.negocio_id });
      res.status(201).json({ success: true, data: repartidor, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarRepartidores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repartidores = await DeliveryService.listarRepartidores(req.usuario!.negocio_id);
      res.json({ success: true, data: repartidores, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  actualizarRepartidor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const repartidor = await DeliveryService.actualizarRepartidor(req.params.id, req.usuario!.negocio_id, req.body);
      res.json({ success: true, data: repartidor, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  crearPedido = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pedido = await PedidoService.crearPedido({ ...req.body, negocio_id: req.usuario!.negocio_id });
      res.status(201).json({ success: true, data: pedido, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  asignarRepartidor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { pedido_id, repartidor_id } = req.body;
      const resultado = await PedidoService.asignarRepartidor(pedido_id, repartidor_id, req.usuario!.negocio_id);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  actualizarEstado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estado, notas } = req.body;
      const resultado = await PedidoService.actualizarEstado(req.params.id, estado, req.usuario!.negocio_id, notas);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarPedidos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await PedidoService.listarPedidos({ negocio_id: req.usuario!.negocio_id, ...req.query as any });
      res.json({ success: true, ...resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  trackingPedido = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tracking = await PedidoService.trackingPedido(req.params.id, req.usuario!.negocio_id);
      res.json({ success: true, data: tracking, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  resumenDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resumen = await PedidoService.resumenDelivery(req.usuario!.negocio_id);
      res.json({ success: true, data: resumen, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };
}

export default new DeliveryController();
