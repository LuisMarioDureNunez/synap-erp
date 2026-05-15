// ============================================
// SYNAP - CONTROLADOR CRM
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Request, Response, NextFunction } from 'express';
import ClienteService from './services/cliente.service';
import FiadoService from './services/fiado.service';
import PuntosService from './services/puntos.service';
import { IRespuestaAPI } from '../../types';

class CrmController {

  crearCliente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cliente = await ClienteService.crear({ ...req.body, negocio_id: req.usuario!.negocio_id });
      res.status(201).json({ success: true, data: cliente, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  obtenerCliente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cliente = await ClienteService.obtenerPorId(req.params.id, req.usuario!.negocio_id);
      res.json({ success: true, data: cliente, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarClientes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await ClienteService.listar({ negocio_id: req.usuario!.negocio_id, ...req.query as any });
      res.json({ success: true, ...resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  actualizarCliente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cliente = await ClienteService.actualizar(req.params.id, req.usuario!.negocio_id, req.body);
      res.json({ success: true, data: cliente, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  segmentarClientes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentos = await ClienteService.segmentar(req.usuario!.negocio_id);
      res.json({ success: true, data: segmentos, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  cumpleaneros = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await ClienteService.cumpleaneros(
        req.usuario!.negocio_id, parseInt(req.query.dias as string) || 7
      );
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  crearFiado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fiado = await FiadoService.crear({ ...req.body, negocio_id: req.usuario!.negocio_id, usuario_id: req.usuario!.id });
      res.status(201).json({ success: true, data: fiado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  registrarPago = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await FiadoService.registrarPago({
        ...req.body, usuario_id: req.usuario!.id, negocio_id: req.usuario!.negocio_id
      });
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarFiados = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await FiadoService.listar({ negocio_id: req.usuario!.negocio_id, ...req.query as any });
      res.json({ success: true, ...resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  obtenerPagosFiado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pagos = await FiadoService.obtenerPagos(req.params.id, req.usuario!.negocio_id);
      res.json({ success: true, data: pagos, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  resumenFiados = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resumen = await FiadoService.resumenFiados(req.usuario!.negocio_id);
      res.json({ success: true, data: resumen, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  configurarPuntos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const programa = await PuntosService.configurarPrograma({ ...req.body, negocio_id: req.usuario!.negocio_id });
      res.status(201).json({ success: true, data: programa, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  canjearPuntos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await PuntosService.canjearPuntos({ ...req.body, usuario_id: req.usuario!.id, negocio_id: req.usuario!.negocio_id });
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  historialPuntos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const historial = await PuntosService.historialPuntos(req.params.cliente_id, req.usuario!.negocio_id);
      res.json({ success: true, data: historial, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  rankingPuntos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ranking = await PuntosService.rankingClientes(req.usuario!.negocio_id, parseInt(req.query.limite as string) || 20);
      res.json({ success: true, data: ranking, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };
}

export default new CrmController();
