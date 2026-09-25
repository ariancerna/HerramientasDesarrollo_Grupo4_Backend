import { ApiError } from '../../lib/errors/api-error';
import * as repository from './auth.repository';

export async function login(usuario: string, password: string) {
  const email = await repository.findEmailByUsuario(usuario);
  if (!email) throw ApiError.unauthorized('Usuario o contraseña incorrectos');

  const { data, error } = await repository.signInWithPassword(email, password);
  if (error || !data.session) throw ApiError.unauthorized('Usuario o contraseña incorrectos');

  // TODO: además de la sesión, devolver el objeto Usuario completo
  // (id, usuario, nombre, rol, estudianteId?) tal como lo espera el store del front.
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    usuario: data.user,
  };
}

export async function refresh(refreshToken: string) {
  const { data, error } = await repository.refreshSession(refreshToken);
  if (error || !data.session) throw ApiError.unauthorized('No se pudo renovar la sesión');
  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}

export async function usuarioDisponible(usuario: string, excluirId?: string) {
  const existe = await repository.usuarioExiste(usuario, excluirId);
  return { disponible: !existe };
}

// TODO: register, forgotPassword, verifyCode, resetPassword
// Ver AUTH-05 a AUTH-09 en docs/ENDPOINTS.md — hay una decisión pendiente
// sobre qué rol/datos debe pedir el registro público (decisión #2).
