// ============================================
// SYNAP - MIDDLEWARE DE SEGURIDAD AVANZADA
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// PROTECCION COMPLETA PARA PRODUCCION
// ============================================

import { Request, Response, NextFunction } from 'express';

export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Powered-By', 'SYNAP');
  res.setHeader('Server', 'SYNAP');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
};

export const validarIP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  
  try {
    const { default: DatabaseConnection } = await import('../config/database');
    const bloqueo = await DatabaseConnection.query(
      `SELECT id FROM security.bloqueos_ip WHERE ip_address = $1 AND bloqueado_hasta > NOW()`,
      [ip]
    );

    if (bloqueo.rows.length > 0) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado. IP bloqueada por seguridad.',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  } catch (error) {
    // Si falla la consulta, permitir acceso
  }

  next();
};
