import type { NextFunction, Request, Response } from 'express';
import { horariosService } from './horarios.service';
import { ok } from '../../lib/utils/response';

export async function eliminar(req: Request, res: Response, next: NextFunction) {
  try {
    await horariosService.eliminar(req.params.id, req.params.horarioId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await horariosService.actualizar(req.params.id, req.params.horarioId, req.body));
  } catch (error) {
    next(error);
  }
}
