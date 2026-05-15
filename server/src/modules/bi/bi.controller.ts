// ============================================
// SYNAP - CONTROLADOR DE BUSINESS INTELLIGENCE
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Request, Response, NextFunction } from 'express';
import BIService from './services/bi.service';
import IAService from './services/ia.service';
import { IRespuestaAPI } from '../../../types';

class BIController {

  metricasDiarias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metricas = await BIService.generarMetricasDiarias(req.usuario!.negocio_id, req.query.fecha as string);
      res.json({ success: true, data: metricas, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  tendenciasVentas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tendencias = await BIService.tendenciasVentas(req.usuario!.negocio_id, parseInt(req.query.dias as string) || 30);
      res.json({ success: true, data: tendencias, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  dashboardGeneral = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dashboard = await BIService.dashboardGeneral(req.usuario!.negocio_id);
      res.json({ success: true, data: dashboard, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  comparativaMensual = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comparativa = await BIService.comparativaMensual(req.usuario!.negocio_id, parseInt(req.query.meses as string) || 6);
      res.json({ success: true, data: comparativa, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  predecirVentas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const prediccion = await IAService.predecirVentas(req.usuario!.negocio_id, parseInt(req.query.dias as string) || 7);
      res.json({ success: true, data: prediccion, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  detectarAnomalias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const anomalias = await IAService.detectarAnomalias(req.usuario!.negocio_id);
      res.json({ success: true, data: anomalias, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  recomendacionesInteligentes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const recomendaciones = await IAService.recomendacionesInteligentes(req.usuario!.negocio_id);
      res.json({ success: true, data: recomendaciones, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };
}

export default new BIController();
