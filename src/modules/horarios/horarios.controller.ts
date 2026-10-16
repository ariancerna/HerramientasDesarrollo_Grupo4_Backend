import { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../lib/utils/response';
import * as service from './horarios.service';
export async function list(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.list(req.params.id, req.query)); } catch (error) { next(error); }
}
export async function getById(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.getById(req.params.id, req.params.horarioId)); } catch (error) { next(error); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { created(res, await service.create(req.params.id, req.body)); } catch (error) { next(error); }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.update(req.params.id, req.params.horarioId, req.body)); } catch (error) { next(error); }
}
export async function mine(req: Request, res: Response, next: NextFunction) {
  try { ok(res, await service.misHorarios(req.user!, req.query.dia as string | undefined)); } catch (error) { next(error); }
}
export async function remove(req: Request, res: Response, next: NextFunction) {
  try { await service.remove(req.params.id, req.params.horarioId); res.status(204).send(); } catch (error) { next(error); }
}
