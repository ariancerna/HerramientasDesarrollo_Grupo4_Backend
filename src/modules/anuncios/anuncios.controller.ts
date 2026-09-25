import { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../lib/utils/response';
import * as service from './anuncios.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.list(req.query));
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.getById(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    created(res, await service.create(req.body));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.update(req.params.id, req.body));
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
