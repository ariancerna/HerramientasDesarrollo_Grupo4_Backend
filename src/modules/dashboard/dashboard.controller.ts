import { NextFunction, Request, Response } from 'express';
import { ok } from '../../lib/utils/response';
import * as service from './dashboard.service';

export async function admin(_req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.resumenAdmin());
  } catch (err) {
    next(err);
  }
}

export async function profesor(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.resumenProfesor(req.user!.profesorId ?? req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function alumno(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.resumenAlumno(req.user!.estudianteId ?? req.user!.id));
  } catch (err) {
    next(err);
  }
}
