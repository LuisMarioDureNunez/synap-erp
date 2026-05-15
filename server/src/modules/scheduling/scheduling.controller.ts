// ============================================
// SYNAP - CONTROLADOR DE AGENDA Y CITAS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Request, Response, NextFunction } from 'express';
import CitasService from './services/citas.service';
import { IRespuestaAPI } from '../../types';

class SchedulingController {

  crearServicio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const servicio = await CitasService.crearServicio({ ...req.body, negocio_id: req.usuario!.negocio_id });
      res.status(201).json({ success: true, data: servicio, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarServicios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const servicios = await CitasService.listarServicios(req.usuario!.negocio_id);
      res.json({ success: true, data: servicios, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  crearCita = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cita = await CitasService.crearCita({ ...req.body, negocio_id: req.usuario!.negocio_id });
      res.status(201).json({ success: true, data: cita, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarCitas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await CitasService.listarCitas({
        negocio_id: req.usuario!.negocio_id, ...req.query as any
      });
      res.json({ success: true, ...resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  actualizarEstadoCita = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estado, notas } = req.body;
      const cita = await CitasService.actualizarEstadoCita(req.params.id, req.usuario!.negocio_id, estado, notas);
      res.json({ success: true, data: cita, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  agendaSemanal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agenda = await CitasService.agendaSemanal(req.usuario!.negocio_id, req.query.fecha_inicio as string);
      res.json({ success: true, data: agenda, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  citasDelDia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const citas = await CitasService.citasDelDia(req.usuario!.negocio_id);
      res.json({ success: true, data: citas, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };
}

export default new SchedulingController();
