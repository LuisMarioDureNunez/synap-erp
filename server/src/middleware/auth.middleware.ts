// ============================================
// SYNAP - MIDDLEWARE DE AUTENTICACION
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// VERIFICACION JWT + ROLES + 2FA
// ============================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import DatabaseConnection from '../config/database';
import { IUsuarioPayload, IRespuestaAPI, RolSistema } from '../types';

interface JwtPayload {
  id: string;
  negocio_id: string;
  rol: string;
  username: string;
  pendiente_2fa?: boolean;
  iat?: number;
  exp?: number;
  iss?: string;
  sub?: string;
}

export const autenticar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Token de acceso no proporcionado',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token de acceso invalido',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'synap_secret',
      { algorithms: ['HS512'] }
    ) as JwtPayload;

    if (decoded.pendiente_2fa) {
      res.status(403).json({
        success: false,
        error: 'Se requiere verificacion de dos factores',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
      return;
    }

    const usuario = await DatabaseConnection.query(
      `SELECT id, negocio_id, username, rol, nombre_completo, sucursal_id, activo
       FROM auth.usuarios WHERE id = $1 AND activo = true`,
      [decoded.id]
    );

    if (usuario.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Usuario no encontrado o inactivo',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
      return;
    }

    req.usuario = {
      id: usuario.rows[0].id,
      negocio_id: usuario.rows[0].negocio_id,
      username: usuario.rows[0].username,
      rol: usuario.rows[0].rol,
      nombre_completo: usuario.rows[0].nombre_completo,
      sucursal_id: usuario.rows[0].sucursal_id,
    };

    const sesionActiva = await DatabaseConnection.query(
      `SELECT id FROM auth.sesiones 
       WHERE usuario_id = $1 AND token_hash = $2 AND activa = true AND expira_en > NOW()`,
      [decoded.id, require('crypto').createHash('sha256').update(token).digest('hex')]
    );

    if (sesionActiva.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Sesion expirada o invalida',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
      return;
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expirado. Utilice el refresh token para renovar.',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Token invalido',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Error de autenticacion',
      timestamp: new Date().toISOString(),
    } as IRespuestaAPI);
  }
};

export const autorizar = (...roles: RolSistema[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({
        success: false,
        error: 'No autenticado',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
      return;
    }

    if (!roles.includes(req.usuario.rol as RolSistema)) {
      res.status(403).json({
        success: false,
        error: 'No tiene permisos para acceder a este recurso',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
      return;
    }

    next();
  };
};
