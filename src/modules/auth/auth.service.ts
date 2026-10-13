import { ApiError } from '../../lib/errors/api-error';
import * as repository from './auth.repository';
import { crearCuentaParaAlumno } from '../usuarios/usuarios.service';

export async function login(usuario: string, password: string) {
  const email = await repository.findEmailByUsuario(usuario);
  if (!email) throw ApiError.unauthorized('Usuario o contraseña incorrectos');

  const { data, error } = await repository.signInWithPassword(email, password);
  if (error || !data.session) throw ApiError.unauthorized('Usuario o contraseña incorrectos');

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

/**
 * AUTH-05 — Registro público por DNI (decisión #2 del docs/ENDPOINTS.md):
 * NO crea un alumno nuevo. El alumno ya debe existir (lo creó el admin,
 * ALU-04); esto solo le crea sus credenciales de acceso.
 */
export async function register(dni: string, usuario: string, password: string) {
  const alumno = await repository.findAlumnoByDni(dni);
  if (!alumno) {
    throw ApiError.notFound('No encontramos un alumno con ese DNI. Pide a un administrador que te registre primero.');
  }
  // Las restricciones nuevas son compartidas: mismo rollback y vinculación que USR-01.
  try {
    await crearCuentaParaAlumno(alumno.id, usuario, password);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'AUTH_CLEANUP_REQUIRED') {
      // El UUID pendiente solo corresponde al operador, no a una respuesta pública.
      console.error('AUTH_CLEANUP_REQUIRED durante registro público', error.details);
      throw ApiError.internal('No se pudo completar el registro; contacta a administración');
    }
    throw error;
  }
  return { mensaje: 'Cuenta creada correctamente. Ya puedes iniciar sesión.' };
}

/** AUTH-07 — Siempre responde igual exista o no el correo (no revela cuentas). */
export async function forgotPassword(correo: string) {
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  await repository.guardarCodigoRecuperacion(correo, codigo);

  // TODO: integrar un proveedor real de correo (Resend, SendGrid, etc.).
  // Por ahora, para poder probar en desarrollo, lo mostramos en la consola del server.
  console.log(`📧 [DEV] Código de recuperación para ${correo}: ${codigo}`);

  return { mensaje: 'Si el correo está registrado, te enviamos un código de verificación.' };
}

/** AUTH-08 — Valida el código y entrega un resetToken de corta duración. */
export async function verifyCode(correo: string, codigo: string) {
  const fila = await repository.obtenerCodigoVigente(correo, codigo);
  if (!fila) throw ApiError.badRequest('El código es inválido o ya expiró.');

  await repository.marcarCodigoUsado(fila.id);
  const resetToken = await repository.guardarResetToken(correo);
  return { resetToken };
}

/** AUTH-09 — Cambia la contraseña usando el resetToken de verifyCode. */
export async function resetPassword(resetToken: string, nuevaPassword: string) {
  const fila = await repository.obtenerResetTokenVigente(resetToken);
  if (!fila) throw ApiError.badRequest('El enlace/código expiró, solicita uno nuevo.');

  const usuario = await repository.obtenerUsuarioPorEmail(fila.correo);
  if (!usuario) throw ApiError.notFound('No encontramos una cuenta con ese correo.');

  await repository.actualizarPasswordAuth(usuario.id, nuevaPassword);
  await repository.marcarResetTokenUsado(fila.id);

  return { mensaje: 'Contraseña actualizada correctamente.' };
}

/** AUTH-10 — Cambiar contraseña estando logueado (pide la actual primero). */
export async function changePassword(email: string, id: string, passwordActual: string, passwordNueva: string) {
  await repository.cambiarPasswordPropia(email, id, passwordActual, passwordNueva);
  return { mensaje: 'Contraseña actualizada correctamente.' };
}
