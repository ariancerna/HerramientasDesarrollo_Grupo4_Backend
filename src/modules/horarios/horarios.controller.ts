import type { NextFunction, Request, Response } from 'express';
import { horariosService } from './horarios.service';

export async function eliminar(req: Request, res: Response, next: NextFunction) {
  try {
    await horariosService.eliminar(req.params.id, req.params.horarioId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
