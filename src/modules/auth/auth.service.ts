import { randomInt } from 'node:crypto';
import { env } from '../../config/env';
import { ApiError } from '../../lib/errors/api-error';
import { enviarCorreo, hayProveedorCorreo } from '../../lib/correo/correo';
import { correoCodigoRecuperacion } from '../../lib/correo/plantillas';
import * as repository from './auth.repository';
import { crearCuentaParaAlumno } from '../usuarios/usuarios.service';

export async function login(usuario: string, password: string) {
  const cuenta = await repository.findCuentaByUsuario(usuario);
  if (!cuenta) throw ApiError.unauthorized('Usuario o contraseña incorrectos');

  const { data, error } = await repository.signInWithPassword(cuenta.email, password);
  if (error || !data.session) throw ApiError.unauthorized('Usuario o contraseña incorrectos');
  if (!cuenta.activo) {
    await repository.revocarSesion(data.session.access_token);
    throw ApiError.forbidden('Tu cuenta está deshabilitada.');
  }

  // Forma del tipo Usuario del front: nunca el objeto interno de Supabase Auth.
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    usuario: {
      id: cuenta.id, usuario: cuenta.usuario, nombre: cuenta.nombre, rol: cuenta.rol,
      ...(cuenta.estudiante_id ? { estudianteId: cuenta.estudiante_id } : {}),
    },
  };
}

/** AUTH-02 — revoca el refresh token de la sesión actual en Supabase. */
export async function logout(accessToken: string) {
  await repository.revocarSesion(accessToken);
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
const MINUTOS_VIGENCIA_CODIGO = 10;
const normalizarCorreo = (correo: string) => correo.trim().toLowerCase();

/**
 * AUTH-07 — Envía al correo un código de 6 dígitos para recuperar la contraseña.
 * La respuesta es siempre la misma exista o no la cuenta, para no revelar qué
 * correos están registrados.
 *
 * Quién envía el correo:
 * - Con BREVO_API_KEY o RESEND_API_KEY: el backend genera el código y lo envía por esa API.
 * - Sin ellas: Supabase Auth envía su correo "Reset Password" con el SMTP del
 *   proyecto (por ejemplo Gmail), y el código lo genera y valida Supabase.
 */
export async function forgotPassword(correoIngresado: string) {
  const correo = normalizarCorreo(correoIngresado);
  const respuesta = { mensaje: 'Si el correo está registrado, te enviamos un código de verificación.' };

  if (!hayProveedorCorreo()) {
    const usuario = await repository.obtenerUsuarioPorEmail(correo);
    if (!usuario || usuario.activo === false) return respuesta;
    await repository.enviarCodigoSupabase(usuario.email);
    return respuesta;
  }

  // Cooldown de 30 s por correo y solo para cuentas existentes y activas.
  if (await repository.codigoReciente(correo, 30)) return respuesta;
  const usuario = await repository.obtenerUsuarioPorEmail(correo);
  if (!usuario || usuario.activo === false) return respuesta;

  const codigo = String(randomInt(100000, 1000000));
  await repository.invalidarCodigos(correo);
  await repository.guardarCodigoRecuperacion(correo, codigo);

  try {
    await enviarCorreo(correoCodigoRecuperacion({
      para: correo,
      nombre: usuario.nombre,
      codigo,
      minutosVigencia: MINUTOS_VIGENCIA_CODIGO,
      club: env.correoRemitenteNombre,
    }));
  } catch (error) {
    // Si el correo no salió, el código no sirve: se anula para poder pedir otro sin esperar.
    await repository.invalidarCodigos(correo);
    throw error;
  }

  return respuesta;
}

/** AUTH-08 — Valida el código y entrega un resetToken de corta duración. */
export async function verifyCode(correoIngresado: string, codigo: string) {
  const correo = normalizarCorreo(correoIngresado);
  // Máximo 5 intentos por código; al agotarlos hay que pedir uno nuevo (AUTH-07).
  const resultado = hayProveedorCorreo()
    ? await repository.verificarCodigo(correo, codigo.trim())
    : await repository.verificarCodigoSupabase(correo, codigo.trim());
  if (resultado === 'bloqueado') {
    throw new ApiError(429, 'TOO_MANY_REQUESTS', 'Demasiados intentos. Solicita un nuevo código.');
  }
  if (resultado !== 'ok') throw ApiError.badRequest('El código es inválido o ya expiró.');

  const resetToken = await repository.guardarResetToken(correo);
  // Quien ya demostró ser dueño del correo puede ver su nombre de usuario (solo lectura en el front).
  const cuenta = await repository.obtenerUsuarioPorEmail(correo);
  return cuenta?.usuario ? { resetToken, usuario: cuenta.usuario as string } : { resetToken };
}

/** AUTH-09 — Cambia la contraseña usando el resetToken de verifyCode. */
export async function resetPassword(resetToken: string, nuevaPassword: string) {
  const fila = await repository.obtenerResetTokenVigente(resetToken);
  if (!fila) throw ApiError.badRequest('El enlace/código expiró, solicita uno nuevo.');

  const usuario = await repository.obtenerUsuarioPorEmail(fila.correo);
  if (!usuario) throw ApiError.notFound('No encontramos una cuenta con ese correo.');
  if (usuario.activo === false) throw ApiError.forbidden('Tu cuenta está deshabilitada.');

  try {
    await repository.actualizarPasswordAuth(usuario.id, nuevaPassword);
  } catch (error) {
    // Supabase rechaza contraseñas que no cumplen su política (p. ej. muy débiles).
    const { status, message } = (error ?? {}) as { status?: number; message?: string };
    if (status === 400 || status === 422) {
      throw ApiError.badRequest(`La contraseña no es válida: ${message ?? 'elige una más segura'}.`);
    }
    throw error;
  }
  await repository.marcarResetTokenUsado(fila.id);
  await repository.invalidarCodigos(fila.correo);

  return { mensaje: 'Contraseña actualizada correctamente.' };
}

/** AUTH-10 — Cambiar contraseña estando logueado (pide la actual primero). */
export async function changePassword(email: string, id: string, passwordActual: string, passwordNueva: string) {
  await repository.cambiarPasswordPropia(email, id, passwordActual, passwordNueva);
  return { mensaje: 'Contraseña actualizada correctamente.' };
}

/** AUTH-11 — Foto de perfil de la cuenta autenticada (cualquier rol). */
export async function subirFotoPerfil(usuarioId: string, file: Express.Multer.File | undefined) {
  if (!file) throw ApiError.badRequest('Adjunta una imagen en el campo foto');
  return { fotoUrl: await repository.guardarFotoPerfil(usuarioId, file) };
}

export async function quitarFotoPerfil(usuarioId: string) {
  await repository.quitarFotoPerfil(usuarioId);
}
