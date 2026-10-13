import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ApiError } from '../lib/errors/api-error';
import { env } from '../config/env';

// Middleware de errores: SIEMPRE va al final, después de montar todas las rutas.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (typeof err === 'object' && err !== null && 'type' in err && 'status' in err) {
    if (err.type === 'entity.parse.failed' && err.status === 400) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'El cuerpo debe ser un objeto JSON válido' },
      });
    }
    if (err.type === 'entity.too.large' && err.status === 413) {
      return res.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo de la solicitud es demasiado grande' },
      });
    }
  }
  if (err instanceof MulterError) {
    const demasiadoGrande = err.code === 'LIMIT_FILE_SIZE';
    return res.status(demasiadoGrande ? 413 : 400).json({
      error: {
        code: demasiadoGrande ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
        message: demasiadoGrande
          ? 'La imagen no debe superar 1.5 MB'
          : 'Adjunta una sola imagen en el campo foto',
      },
    });
  }

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
