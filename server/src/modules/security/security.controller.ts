// ============================================
// SYNAP - CONTROLADOR DE SEGURIDAD
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Request, Response, NextFunction } from 'express';
import SecurityService from './services/security.service';
import { IRespuestaAPI } from '../../../types';

class SecurityController {

  configurar2FA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await SecurityService.configurar2FA(req.usuario!.id, req.usuario!.negocio_id);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  verificar2FA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await SecurityService.verificar2FA(req.usuario!.id, req.body.codigo);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  desactivar2FA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await SecurityService.desactivar2FA(req.usuario!.id, req.body.password);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  auditoria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await SecurityService.auditoriaAvanzada({
        negocio_id: req.usuario!.negocio_id, ...req.query as any
      });
      res.json({ success: true, ...resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  resumenSeguridad = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resumen = await SecurityService.resumenSeguridad(req.usuario!.negocio_id);
      res.json({ success: true, data: resumen, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  bloquearIP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ip_address, motivo, horas } = req.body;
      const resultado = await SecurityService.bloquearIP(ip_address, motivo, horas || 24);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  desbloquearIP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await SecurityService.desbloquearIP(req.body.ip_address);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  generarRespaldo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await SecurityService.generarRespaldo(req.usuario!.negocio_id);
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  monitoreoSalud = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const salud = await SecurityService.monitoreoSalud();
      res.json({ success: true, data: salud, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };
}

export default new SecurityController();
