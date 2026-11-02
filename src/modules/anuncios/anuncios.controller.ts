import { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../lib/utils/response';
import * as service from './anuncios.service';
import type { FiltroAnuncios, FiltroMisAnuncios } from './anuncios.schema';

export async function list(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listar(req.user!, req.query as unknown as FiltroAnuncios)); } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try { created(res, await service.crear(req.user!, req.body)); } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.editar(req.user!, req.params.id, req.body)); } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await service.eliminar(req.user!, req.params.id); res.status(204).send(); } catch (err) { next(err); }
}

export async function send(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.enviar(req.user!, req.params.id)); } catch (err) { next(err); }
}

export async function mine(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.misAnuncios(req.user!, req.query as unknown as FiltroMisAnuncios)); } catch (err) { next(err); }
}
