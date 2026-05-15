// ============================================
// SYNAP - CONTROLADOR DE AUTENTICACION
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// SISTEMA COMPLETO: LOGIN, REGISTRO, 2FA, REFRESH
// ============================================

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import DatabaseConnection from '../../config/database';
import { IUsuarioPayload, IRespuestaAPI } from '../../types';

interface TokenPayload {
  id: string;
  negocio_id: string;
  rol: string;
  username: string;
}

class AuthController {

  private generarAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET || 'synap_secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      algorithm: 'HS512',
      issuer: 'synap-lmtn',
      subject: payload.id,
    });
  }

  private generarRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private async guardarRefreshToken(usuarioId: string, token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha512').update(token).digest('hex');
    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + 7);

    await DatabaseConnection.query(
      `INSERT INTO auth.refresh_tokens (usuario_id, token_hash, expira_en) VALUES ($1, $2, $3)`,
      [usuarioId, tokenHash, expiraEn]
    );
  }

  private async validarRefreshToken(usuarioId: string, token: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha512').update(token).digest('hex');
    const result = await DatabaseConnection.query(
      `SELECT id FROM auth.refresh_tokens 
       WHERE usuario_id = $1 AND token_hash = $2 AND usado = false AND expira_en > NOW()`,
      [usuarioId, tokenHash]
    );
    return result.rows.length > 0;
  }

  private async invalidarRefreshToken(usuarioId: string, token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha512').update(token).digest('hex');
    await DatabaseConnection.query(
      `UPDATE auth.refresh_tokens SET usado = true WHERE usuario_id = $1 AND token_hash = $2`,
      [usuarioId, tokenHash]
    );
  }

  private async registrarAuditoria(datos: {
    negocio_id: string;
    usuario_id: string;
    accion: string;
    entidad: string;
    ip_address: string;
    user_agent: string;
  }): Promise<void> {
    await DatabaseConnection.query(
      `INSERT INTO security.auditoria (negocio_id, usuario_id, accion, entidad, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [datos.negocio_id, datos.usuario_id, datos.accion, datos.entidad, datos.ip_address, datos.user_agent]
    );
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password, negocio_id } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: 'Usuario y contrasena son requeridos',
          timestamp: new Date().toISOString(),
        } as IRespuestaAPI);
        return;
      }

      const result = await DatabaseConnection.query(
        `SELECT id, negocio_id, username, password_hash, nombre_completo, rol, 
                activo, verificado, dos_factores_activo
         FROM auth.usuarios 
         WHERE username = $1 AND activo = true`,
        [username]
      );

      if (result.rows.length === 0) {
        await DatabaseConnection.query(
          `INSERT INTO security.intentos_acceso (username, ip_address, user_agent, exito, motivo_fallo)
           VALUES ($1, $2, $3, false, 'usuario_no_encontrado')`,
          [username, req.ip, req.headers['user-agent'] || 'desconocido']
        );

        res.status(401).json({
          success: false,
          error: 'Credenciales invalidas',
          timestamp: new Date().toISOString(),
        } as IRespuestaAPI);
        return;
      }

      const usuario = result.rows[0];

      if (!usuario.activo) {
        res.status(403).json({
          success: false,
          error: 'Cuenta desactivada. Contacte al administrador.',
          timestamp: new Date().toISOString(),
        } as IRespuestaAPI);
        return;
      }

      const passwordValido = await bcrypt.compare(password, usuario.password_hash);
      if (!passwordValido) {
        await DatabaseConnection.query(
          `INSERT INTO security.intentos_acceso (username, ip_address, user_agent, exito, motivo_fallo)
           VALUES ($1, $2, $3, false, 'contrasena_incorrecta')`,
          [username, req.ip, req.headers['user-agent'] || 'desconocido']
        );

        res.status(401).json({
          success: false,
          error: 'Credenciales invalidas',
          timestamp: new Date().toISOString(),
        } as IRespuestaAPI);
        return;
      }

      if (usuario.dos_factores_activo) {
        const tokenTemporal = jwt.sign(
          { id: usuario.id, pendiente_2fa: true },
          process.env.JWT_SECRET || 'synap_secret',
          { expiresIn: '5m', algorithm: 'HS512' }
        );

        res.json({
          success: true,
          data: {
            requiere_2fa: true,
            token_temporal: tokenTemporal,
            mensaje: 'Se requiere verificacion de dos factores',
          },
          timestamp: new Date().toISOString(),
        } as IRespuestaAPI);
        return;
      }

      const payload: TokenPayload = {
        id: usuario.id,
        negocio_id: usuario.negocio_id,
        rol: usuario.rol,
        username: usuario.username,
      };

      const accessToken = this.generarAccessToken(payload);
      const refreshToken = this.generarRefreshToken();

      await this.guardarRefreshToken(usuario.id, refreshToken);

      await DatabaseConnection.query(
        `INSERT INTO auth.sesiones (usuario_id, token_hash, ip_address, user_agent, dispositivo, expira_en)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          usuario.id,
          crypto.createHash('sha256').update(accessToken).digest('hex'),
          req.ip,
          req.headers['user-agent'] || 'desconocido',
          req.headers['x-dispositivo'] || 'web',
          new Date(Date.now() + 24 * 60 * 60 * 1000),
        ]
      );

      await DatabaseConnection.query(
        `UPDATE auth.usuarios SET ultimo_acceso = NOW() WHERE id = $1`,
        [usuario.id]
      );

      await this.registrarAuditoria({
        negocio_id: usuario.negocio_id,
        usuario_id: usuario.id,
        accion: 'LOGIN',
        entidad: 'auth.usuarios',
        ip_address: req.ip || 'desconocido',
        user_agent: req.headers['user-agent'] || 'desconocido',
      });

      await DatabaseConnection.query(
        `INSERT INTO security.intentos_acceso (username, ip_address, user_agent, exito)
         VALUES ($1, $2, $3, true)`,
        [username, req.ip, req.headers['user-agent'] || 'desconocido']
      );

      res.json({
        success: true,
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 86400,
          usuario: {
            id: usuario.id,
            username: usuario.username,
            nombre_completo: usuario.nombre_completo,
            rol: usuario.rol,
            negocio_id: usuario.negocio_id,
          },
        },
        message: 'Autenticacion exitosa',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refresh_token, usuario_id } = req.body;

      if (!refresh_token || !usuario_id) {
        res.status(400).json({
          success: false,
          error: 'Refresh token y usuario_id son requeridos',
          timestamp: new Date().toISOString(),
        } as IRespuestaAPI);
        return;
      }

      const esValido = await this.validarRefreshToken(usuario_id, refresh_token);
      if (!esValido) {
        res.status(401).json({
          success: false,
          error: 'Refresh token invalido o expirado',
          timestamp: new Date().toISOString(),
        } as IRespuestaAPI);
        return;
      }

      const result = await DatabaseConnection.query(
        `SELECT id, negocio_id, username, rol FROM auth.usuarios WHERE id = $1 AND activo = true`,
        [usuario_id]
      );

      if (result.rows.length === 0) {
        res.status(401).json({
          success: false,
          error: 'Usuario no encontrado o inactivo',
          timestamp: new Date().toISOString(),
        } as IRespuestaAPI);
        return;
      }

      const usuario = result.rows[0];
      const payload: TokenPayload = {
        id: usuario.id,
        negocio_id: usuario.negocio_id,
        rol: usuario.rol,
        username: usuario.username,
      };

      const nuevoAccessToken = this.generarAccessToken(payload);
      const nuevoRefreshToken = this.generarRefreshToken();

      await this.invalidarRefreshToken(usuario_id, refresh_token);
      await this.guardarRefreshToken(usuario_id, nuevoRefreshToken);

      res.json({
        success: true,
        data: {
          access_token: nuevoAccessToken,
          refresh_token: nuevoRefreshToken,
          token_type: 'Bearer',
          expires_in: 86400,
        },
        message: 'Token renovado exitosamente',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuario = req.usuario;
      if (!usuario) {
        res.status(401).json({
          success: false,
          error: 'No autenticado',
          timestamp: new Date().toISOString(),
        } as IRespuestaAPI);
        return;
      }

      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await DatabaseConnection.query(
          `UPDATE auth.sesiones SET activa = false WHERE token_hash = $1`,
          [tokenHash]
        );
      }

      await this.registrarAuditoria({
        negocio_id: usuario.negocio_id,
        usuario_id: usuario.id,
        accion: 'LOGOUT',
        entidad: 'auth.usuarios',
        ip_address: req.ip || 'desconocido',
        user_agent: req.headers['user-agent'] || 'desconocido',
      });

      res.json({
        success: true,
        message: 'Sesion cerrada exitosamente',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  perfil = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuario = req.usuario;
      if (!usuario) {
        res.status(401).json({ success: false, error: 'No autenticado', timestamp: new Date().toISOString() } as IRespuestaAPI);
        return;
      }

      const result = await DatabaseConnection.query(
        `SELECT id, username, email, nombre_completo, rol, avatar_url, 
                dos_factores_activo, ultimo_acceso, created_at
         FROM auth.usuarios WHERE id = $1`,
        [usuario.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Usuario no encontrado', timestamp: new Date().toISOString() } as IRespuestaAPI);
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };

  cambiarPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuario = req.usuario;
      const { password_actual, password_nuevo } = req.body;

      if (!usuario) {
        res.status(401).json({ success: false, error: 'No autenticado', timestamp: new Date().toISOString() } as IRespuestaAPI);
        return;
      }

      if (!password_actual || !password_nuevo) {
        res.status(400).json({ success: false, error: 'Contrasena actual y nueva son requeridas', timestamp: new Date().toISOString() } as IRespuestaAPI);
        return;
      }

      if (password_nuevo.length < 8) {
        res.status(400).json({ success: false, error: 'La contrasena nueva debe tener al menos 8 caracteres', timestamp: new Date().toISOString() } as IRespuestaAPI);
        return;
      }

      const result = await DatabaseConnection.query(
        `SELECT password_hash FROM auth.usuarios WHERE id = $1`,
        [usuario.id]
      );

      const passwordValido = await bcrypt.compare(password_actual, result.rows[0].password_hash);
      if (!passwordValido) {
        res.status(400).json({ success: false, error: 'Contrasena actual incorrecta', timestamp: new Date().toISOString() } as IRespuestaAPI);
        return;
      }

      const nuevoHash = await bcrypt.hash(password_nuevo, 12);
      await DatabaseConnection.query(
        `UPDATE auth.usuarios SET password_hash = $1 WHERE id = $2`,
        [nuevoHash, usuario.id]
      );

      await this.registrarAuditoria({
        negocio_id: usuario.negocio_id,
        usuario_id: usuario.id,
        accion: 'CAMBIO_PASSWORD',
        entidad: 'auth.usuarios',
        ip_address: req.ip || 'desconocido',
        user_agent: req.headers['user-agent'] || 'desconocido',
      });

      res.json({
        success: true,
        message: 'Contrasena cambiada exitosamente',
        timestamp: new Date().toISOString(),
      } as IRespuestaAPI);
    } catch (error) {
      next(error);
    }
  };
}

export default new AuthController();
