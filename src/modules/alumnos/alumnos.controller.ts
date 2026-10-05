import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../lib/errors/api-error';
import { created, ok } from '../../lib/utils/response';
import * as service from './alumnos.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.list(req.user, req.query));
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.getById(req.user, req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function getByDni(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.getByDni(req.user, req.params.dni));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    created(res, await service.create(req.user, req.body));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.update(req.user, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function updateState(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.updateState(req.params.id, req.body));
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

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const alumnoId = req.user?.estudianteId;
    if (!alumnoId) {
      return next(ApiError.forbidden('Este usuario no tiene un perfil de alumno asociado'));
    }

    ok(res, await service.getProfile(alumnoId));
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const alumnoId = req.user?.estudianteId;
    if (!alumnoId) {
      return next(ApiError.forbidden('Este usuario no tiene un perfil de alumno asociado'));
    }

    ok(res, await service.updateProfile(alumnoId, req.body));
  } catch (err) {
    next(err);
  }
}

export async function uploadProfilePhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const alumnoId = req.user?.estudianteId;
    if (!alumnoId) {
      return next(ApiError.forbidden('Este usuario no tiene un perfil de alumno asociado'));
    }

    ok(res, await service.uploadProfilePhoto(alumnoId, req.file));
  } catch (err) {
    next(err);
  }
}

export async function deleteProfilePhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const alumnoId = req.user?.estudianteId;
    if (!alumnoId) {
      return next(ApiError.forbidden('Este usuario no tiene un perfil de alumno asociado'));
    }

    ok(res, await service.deleteProfilePhoto(alumnoId));
  } catch (err) {
    next(err);
  }
}
