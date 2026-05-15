// ============================================
// SYNAP - MIDDLEWARE DE AUDITORIA
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Request, Response, NextFunction } from 'express';
import DatabaseConnection from '../config/database';
import { IAuditoriaCreate } from '../types';

export const auditoriaMiddleware = async (accion: string, entidad: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      if (res.statusCode < 400 && req.usuario) {
        const datosAuditoria: IAuditoriaCreate = {
          negocio_id: req.usuario.negocio_id,
          usuario_id: req.usuario.id,
          accion,
          entidad,
          entidad_id: body?.data?.id || req.params.id,
          ip_address: req.ip || 'desconocido',
          user_agent: req.headers['user-agent'] || 'desconocido',
        };

        DatabaseConnection.query(
          `INSERT INTO security.auditoria (negocio_id, usuario_id, accion, entidad, entidad_id, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            datosAuditoria.negocio_id,
            datosAuditoria.usuario_id,
            datosAuditoria.accion,
            datosAuditoria.entidad,
            datosAuditoria.entidad_id,
            datosAuditoria.ip_address,
            datosAuditoria.user_agent,
          ]
        ).catch(err => console.error('Error guardando auditoria:', err));
      }

      return originalJson(body);
    };

    next();
  };
};
