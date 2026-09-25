import { Request, Response } from 'express';

export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  });
}
