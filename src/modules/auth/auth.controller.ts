import { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../lib/utils/response';
import * as service from './auth.service';
import { loginConGoogle, urlAutorizacionGoogle } from './auth.google';

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

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await service.logout(req.headers.authorization!.replace('Bearer ', ''));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function usuarioDisponible(req: Request, res: Response, next: NextFunction) {
  try {
    const { usuario, excluirId } = req.query;
    const result = await service.usuarioDisponible(usuario as string, excluirId as string | undefined);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { dni, usuario, password } = req.body;
    const result = await service.register(dni, usuario, password);
    created(res, result);
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { correo } = req.body;
    const result = await service.forgotPassword(correo);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function verifyCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { correo, codigo } = req.body;
    const result = await service.verifyCode(correo, codigo);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { resetToken, nuevaPassword } = req.body;
    const result = await service.resetPassword(resetToken, nuevaPassword);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { passwordActual, passwordNueva } = req.body;
    const result = await service.changePassword(req.user!.email, req.user!.id, passwordActual, passwordNueva);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}
export async function subirFotoPerfil(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.subirFotoPerfil(req.user!.id, req.file));
  } catch (err) {
    next(err);
  }
}

export async function quitarFotoPerfil(req: Request, res: Response, next: NextFunction) {
  try {
    await service.quitarFotoPerfil(req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** AUTH-12 — URL para iniciar sesión con Google. */
export function googleUrl(req: Request, res: Response) {
  ok(res, urlAutorizacionGoogle(String(req.query.redirectTo)));
}

/** AUTH-13 — Canjea la sesión de Google por la cuenta del club. */
export async function googleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { accessToken, refreshToken } = req.body;
    ok(res, await loginConGoogle(accessToken, refreshToken));
  } catch (err) {
    next(err);
  }
}
