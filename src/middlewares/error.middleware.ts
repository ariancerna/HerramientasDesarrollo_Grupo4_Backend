import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/errors/api-error';
import { env } from '../config/env';

// Middleware de errores: SIEMPRE va al final, después de montar todas las rutas.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (env.nodeEnv !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
  });
}
