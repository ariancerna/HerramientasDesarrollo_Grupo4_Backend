import { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../lib/utils/response';
import * as service from './calendario.service';
import type { FiltroActividades, FiltroEventos } from './calendario.schema';

export async function list(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.listar(req.query as unknown as FiltroEventos)); } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try { created(res, await service.crear(req.body)); } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.editar(req.params.id, req.body)); } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await service.eliminar(req.params.id); res.status(204).send(); } catch (err) { next(err); }
}

export async function actividades(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.actividades(req.user!, req.query as unknown as FiltroActividades));
  } catch (err) { next(err); }
}
