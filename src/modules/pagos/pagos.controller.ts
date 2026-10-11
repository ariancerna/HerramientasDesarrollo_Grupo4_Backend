import { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../lib/utils/response';
import { ApiError } from '../../lib/errors/api-error';
import * as service from './pagos.service';
import type { EstadoMensualQuery } from './pagos.schema';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.list(req.query));
  } catch (err) {
    next(err);
  }
}

export async function estadoMensual(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.estadoMensual(req.query as unknown as EstadoMensualQuery));
  } catch (err) {
    next(err);
  }
}

export async function pagoActual(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await service.pagoActual(req.user));
  } catch (err) {
    next(err);
  }
}

export async function history(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await service.history(req.user));
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

export async function registrarPorId(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.registrarPorId(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function registrarDirecto(req: Request, res: Response, next: NextFunction) {
  try {
    const resultado = await service.registrarDirecto(req.body);
    if (resultado.creado) {
      created(res, resultado.pago);
      return;
    }
    ok(res, resultado.pago);
  } catch (err) {
    next(err);
  }
}

export async function marcarPendiente(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.marcarPendiente(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function generarMensualidad(req: Request, res: Response, next: NextFunction) {
  try {
    const resultado = await service.generarMensualidad(req.body);
    if (resultado.generados > 0) {
      created(res, resultado);
      return;
    }
    ok(res, resultado);
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
