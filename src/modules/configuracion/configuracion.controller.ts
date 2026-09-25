import { NextFunction, Request, Response } from 'express';
import { ok } from '../../lib/utils/response';
import * as service from './configuracion.service';

export async function miConfig(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.obtenerMiConfig(req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function actualizarMiConfig(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.actualizarMiConfig(req.user!.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function configClub(_req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.obtenerConfigClub());
  } catch (err) {
    next(err);
  }
}

export async function actualizarConfigClub(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.actualizarConfigClub(req.body));
  } catch (err) {
    next(err);
  }
}
