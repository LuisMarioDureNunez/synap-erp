// ============================================
// SYNAP - CONTROLADOR DE FINANZAS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Request, Response, NextFunction } from 'express';
import CajaService from './services/caja.service';
import CuentasService from './services/cuentas.service';
import ReportesService from './services/reportes.service';
import { IRespuestaAPI } from '../../types';

class FinanceController {

  abrirCaja = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const caja = await CajaService.abrirCaja({
        ...req.body, negocio_id: req.usuario!.negocio_id, usuario_id: req.usuario!.id
      });
      res.status(201).json({ success: true, data: caja, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  cerrarCaja = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await CajaService.cerrarCaja({
        ...req.body, usuario_id: req.usuario!.id
      });
      res.json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  cajaActual = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const caja = await CajaService.cajaActual(req.usuario!.id);
      res.json({ success: true, data: caja, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  historialCajas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await CajaService.historialCajas({
        negocio_id: req.usuario!.negocio_id, ...req.query as any
      });
      res.json({ success: true, ...resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  crearCuenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cuenta = await CuentasService.crearCuenta({ ...req.body, negocio_id: req.usuario!.negocio_id });
      res.status(201).json({ success: true, data: cuenta, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarCuentas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cuentas = await CuentasService.listarCuentas(req.usuario!.negocio_id);
      res.json({ success: true, data: cuentas, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  registrarTransaccion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await CuentasService.registrarTransaccion({
        ...req.body, negocio_id: req.usuario!.negocio_id, usuario_id: req.usuario!.id
      });
      res.status(201).json({ success: true, data: resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  registrarGasto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gasto = await CuentasService.registrarGasto({
        ...req.body, negocio_id: req.usuario!.negocio_id, usuario_id: req.usuario!.id
      });
      res.status(201).json({ success: true, data: gasto, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  listarGastos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await CuentasService.listarGastos({
        negocio_id: req.usuario!.negocio_id, ...req.query as any
      });
      res.json({ success: true, ...resultado, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  resumenFinanciero = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resumen = await CuentasService.resumenFinanciero(
        req.usuario!.negocio_id, req.query.periodo as string
      );
      res.json({ success: true, data: resumen, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  flujoCaja = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const flujo = await CuentasService.flujoCaja(
        req.usuario!.negocio_id, parseInt(req.query.dias as string) || 30
      );
      res.json({ success: true, data: flujo, timestamp: new Date().toISOString() } as IRespuestaAPI);
    } catch (error) { next(error); }
  };

  reporteVentasPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fecha_inicio, fecha_fin } = req.query;
      const pdf = await ReportesService.generarReporteVentasPDF(
        req.usuario!.negocio_id, fecha_inicio as string, fecha_fin as string
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=reporte_ventas_synap.pdf');
      res.send(pdf);
    } catch (error) { next(error); }
  };

  reporteVentasExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fecha_inicio, fecha_fin } = req.query;
      const excel = await ReportesService.generarReporteVentasExcel(
        req.usuario!.negocio_id, fecha_inicio as string, fecha_fin as string
      );
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=reporte_ventas_synap.xlsx');
      res.send(excel);
    } catch (error) { next(error); }
  };

  balanceGeneralPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pdf = await ReportesService.generarBalanceGeneralPDF(req.usuario!.negocio_id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=balance_general_synap.pdf');
      res.send(pdf);
    } catch (error) { next(error); }
  };
}

export default new FinanceController();
