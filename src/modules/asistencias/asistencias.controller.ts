import { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../lib/utils/response';
import * as service from './asistencias.service';
import type { FiltroAsistencias, FiltroMisAsistencias } from './asistencias.schema';

export async function create(req: Request, res: Response, next: NextFunction) {
  try { created(res, await service.registrar(req.user!, req.body)); } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listar(req.user!, req.query as unknown as FiltroAsistencias)); } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.corregir(req.params.id, req.body)); } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await service.anular(req.params.id); res.status(204).send(); } catch (err) { next(err); }
}

export async function mine(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.misAsistencias(req.user!, req.query as unknown as FiltroMisAsistencias));
  } catch (err) { next(err); }
}
