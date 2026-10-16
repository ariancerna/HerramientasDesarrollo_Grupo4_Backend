import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../lib/errors/api-error';
import { created, ok, paginated } from '../../lib/utils/response';
import { presentAlumno } from './alumnos.repository';
import * as service from './alumnos.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.list(req.user, req.query);
    paginated(res, result.data.map(presentAlumno) as unknown[], { page: result.page, limit: result.limit, total: result.total });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, presentAlumno(await service.getById(req.user, req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function getByDni(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, presentAlumno(await service.getByDni(req.user, req.params.dni)));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    created(res, presentAlumno(await service.create(req.user, req.body)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, presentAlumno(await service.update(req.user, req.params.id, req.body)));
  } catch (err) {
    next(err);
  }
}

export async function updateState(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, presentAlumno(await service.updateState(req.user, req.params.id, req.body)));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.remove(req.user, req.params.id);
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

    ok(res, presentAlumno(await service.getProfile(req.user, alumnoId)));
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

    await service.updateProfile(req.user, alumnoId, req.body);
    // Se relee el perfil para devolver también el nombre de la categoría.
    ok(res, presentAlumno(await service.getProfile(req.user, alumnoId)));
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

    await service.deleteProfilePhoto(req.user, alumnoId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
