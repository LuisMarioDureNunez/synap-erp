import { Request, Response, NextFunction } from 'express';

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

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError('Ruta no encontrada: ' + req.method + ' ' + req.originalUrl, 404);
  next(error);
};

export const errorHandler = (err: Error | AppError, req: Request, res: Response, _next: NextFunction): void => {
  const requestId = (req as any).requestId;
  
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      requestId: requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  console.error('SYNAP ERROR:', {
    mensaje: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    requestId: requestId,
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    requestId: requestId,
    timestamp: new Date().toISOString(),
  });
};
