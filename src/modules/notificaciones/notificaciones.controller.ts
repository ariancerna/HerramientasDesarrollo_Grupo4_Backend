import { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../lib/utils/response';
import * as service from './notificaciones.service';
import type { FiltroNotificaciones } from './notificaciones.schema';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.list(req.user!.id, req.query as unknown as FiltroNotificaciones);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.getById(req.user!.id, req.params.id)); }
  catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.markRead(req.user!.id, req.params.id)); }
  catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await service.remove(req.user!.id, req.params.id); res.status(204).send(); }
  catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try { created(res, await service.create(req.body)); }
  catch (err) { next(err); }
}
