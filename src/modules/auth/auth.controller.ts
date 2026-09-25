import { NextFunction, Request, Response } from 'express';
import { ok } from '../../lib/utils/response';
import * as service from './auth.service';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { usuario, password } = req.body;
    const result = await service.login(usuario, password);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    const result = await service.refresh(refreshToken);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response) {
  ok(res, req.user);
}

export async function logout(_req: Request, res: Response) {
  // TODO: invalidar el refresh token si se guarda del lado del servidor.
  res.status(204).send();
}

export async function usuarioDisponible(req: Request, res: Response, next: NextFunction) {
  try {
    const { usuario, excluirId } = req.query;
    const result = await service.usuarioDisponible(String(usuario), excluirId as string | undefined);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

// TODO: register, forgotPassword, verifyCode, resetPassword (AUTH-05..09)
