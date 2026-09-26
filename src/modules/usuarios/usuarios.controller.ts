import { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../lib/utils/response';
import * as service from './usuarios.service';

export async function crearCuenta(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.crearCuentaParaAlumno(req.params.id, req.body.usuario, req.body.password);
    created(res, data);
  } catch (err) {
    next(err);
  }
}

export async function actualizarEstado(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.actualizarEstado(req.params.id, req.body.activo);
    ok(res, data);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.resetearPassword(req.params.id, req.body.nuevaPassword);
    ok(res, data);
  } catch (err) {
    next(err);
  }
}