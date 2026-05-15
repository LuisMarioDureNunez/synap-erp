// ============================================
// SYNAP - MIDDLEWARE DE ERRORES
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Request, Response, NextFunction } from 'express';
import { IRespuestaAPI } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404);
  next(error);
};

export const errorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction): void => {
  console.error('SYNAP ERROR:', {
    mensaje: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    } as IRespuestaAPI);
    return;
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  } as IRespuestaAPI);
};
