import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../lib/errors/api-error';
import { getPagination } from '../../lib/utils/pagination';
import { created, ok, paginated } from '../../lib/utils/response';
import * as service from './evaluaciones.service';

// El controller solo traduce HTTP <-> service; la lógica de negocio vive en el service.
// requireAuth siempre corre antes, pero verificamos req.user para no depender de un "!".
function usuario(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.list(usuario(req), req.query, getPagination(req));
    paginated(res, result.data, result.meta);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.getById(usuario(req), req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    created(res, await service.create(usuario(req), req.body));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.update(usuario(req), req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
