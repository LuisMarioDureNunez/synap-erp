// ============================================
// SYNAP - CONTROLADOR DE RRHH
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Request, Response, NextFunction } from 'express';
import EmpleadoService from './services/empleado.service';
import AsistenciaService from './services/asistencia.service';
import { IRespuestaAPI } from '../../types';

class HrController {

  crearEmpleado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const empleado = await EmpleadoService.crear({ ...req.body, negocio_id: req.usuario!.negocio_id });
      res.status(201).json({ success: true, data: empleado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  obtenerEmpleado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const empleado = await EmpleadoService.obtenerPorId(req.params.id, req.usuario!.negocio_id);
      res.json({ success: true, data: empleado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarEmpleados = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const empleados = await EmpleadoService.listar(req.usuario!.negocio_id, req.query as any);
      res.json({ success: true, data: empleados, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  actualizarEmpleado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const empleado = await EmpleadoService.actualizar(req.params.id, req.usuario!.negocio_id, req.body);
      res.json({ success: true, data: empleado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  desvincularEmpleado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { motivo } = req.body;
      const resultado = await EmpleadoService.desvincular(req.params.id, req.usuario!.negocio_id, motivo);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  registrarAsistencia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asistencia = await AsistenciaService.registrarAsistencia(req.body);
      res.status(201).json({ success: true, data: asistencia, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  registrarPorQR = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asistencia = await AsistenciaService.registrarPorQR(req.body.qr_data, req.body.sucursal_id);
      res.status(201).json({ success: true, data: asistencia, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  historialAsistencias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await AsistenciaService.historialAsistencias({
        empleado_id: req.params.empleado_id,
        negocio_id: req.usuario!.negocio_id,
        ...req.query as any
      });
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  resumenAsistencias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resumen = await AsistenciaService.resumenAsistencias(
        req.usuario!.negocio_id, req.query.fecha as string
      );
      res.json({ success: true, data: resumen, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  calcularComisiones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fecha_inicio, fecha_fin } = req.query;
      const comisiones = await AsistenciaService.calcularComisiones(
        req.usuario!.negocio_id,
        fecha_inicio as string || new Date().toISOString().split('T')[0],
        fecha_fin as string || new Date().toISOString().split('T')[0]
      );
      res.json({ success: true, data: comisiones, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarComisiones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await AsistenciaService.listarComisiones({
        negocio_id: req.usuario!.negocio_id, ...req.query as any
      });
      res.json({ success: true, ...resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  pagarComisiones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { empleado_id, comision_ids } = req.body;
      const resultado = await AsistenciaService.pagarComisiones(
        req.usuario!.negocio_id, empleado_id, comision_ids
      );
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };
}

export default new HrController();
