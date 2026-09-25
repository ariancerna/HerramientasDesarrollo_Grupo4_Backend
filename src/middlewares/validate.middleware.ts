import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../lib/errors/api-error';

/** Valida req.body contra un schema de Zod antes de llegar al controller. */
export function validateBody(schema: AnyZodObject) {
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
