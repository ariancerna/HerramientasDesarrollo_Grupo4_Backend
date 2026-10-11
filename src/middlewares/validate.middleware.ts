import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { ApiError } from '../lib/errors/api-error';

/** Valida req.body contra un schema de Zod antes de llegar al controller. */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(ApiError.badRequest('Datos inválidos', err.flatten().fieldErrors));
      }
      next(err);
    }
  };
}

/** Valida req.query contra un schema de Zod antes de llegar al controller. */
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(ApiError.badRequest('Parámetros inválidos', err.flatten().fieldErrors));
      }
      next(err);
    }
  };
}

/** Valida req.params contra un schema de Zod antes de llegar al controller. */
export function validateParams(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(ApiError.badRequest('Parámetros de ruta inválidos', err.flatten().fieldErrors));
      }
      next(err);
    }
  };
}
