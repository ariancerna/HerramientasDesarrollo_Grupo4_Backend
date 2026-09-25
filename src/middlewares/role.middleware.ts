import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/errors/api-error';
import { Rol } from '../types/express';

/** Úsalo después de requireAuth: requireRole('ADM'), requireRole('ADM', 'PROF'), etc. */
export function requireRole(...rolesPermitidos: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!rolesPermitidos.includes(req.user.rol)) {
      return next(ApiError.forbidden('Tu rol no tiene acceso a este recurso'));
    }
    next();
  };
}
