import { ApiError } from '../../lib/errors/api-error';
import * as repository from './usuarios.repository';

/** USR-01 — el admin crea la cuenta de acceso de un alumno que ya existe. */
export async function crearCuentaParaAlumno(alumnoId: string, usuario: string, password: string) {
  const alumno = await repository.obtenerAlumnoPorId(alumnoId);
  if (!alumno) throw ApiError.notFound('No existe un alumno con ese id.');

  const yaTieneCuenta = await repository.alumnoTieneUsuario(alumnoId);
  if (yaTieneCuenta) throw ApiError.conflict('Este alumno ya tiene una cuenta creada.');

  const usuarioOcupado = await repository.usuarioExiste(usuario);
  if (usuarioOcupado) throw ApiError.conflict('Ese nombre de usuario ya está en uso.');

  if (!alumno.email) {
    throw ApiError.badRequest('El alumno no tiene un correo registrado; agrégaselo antes de crear su cuenta.');
  }

  const nombreCompleto = `${alumno.nombres} ${alumno.apellidos}`;
  const { data, error } = await repository.crearCuentaAuth(alumno.email, password, nombreCompleto);
  if (error || !data.user) {
    if (['email_exists', 'email_address_exists', 'user_already_exists'].includes(error?.code ?? '')) {
      throw ApiError.conflict('El correo ya tiene una cuenta de acceso');
    }
    if (error?.code === 'weak_password') throw ApiError.badRequest('La contraseña no cumple la política de seguridad');
    throw ApiError.internal('No se pudo crear la cuenta de acceso');
  }

  try {
    await repository.insertarUsuario({
      id: data.user.id, usuario, email: alumno.email, nombre: nombreCompleto, estudianteId: alumnoId,
    });
  } catch (dbError: unknown) {
    try { await repository.eliminarCuentaAuth(data.user.id); }
    catch {
      throw new ApiError(500, 'AUTH_CLEANUP_REQUIRED',
        'No se pudo revertir la cuenta recién creada; requiere limpieza administrativa',
        { authUserId: data.user.id });
    }
    const code = typeof dbError === 'object' && dbError !== null && 'code' in dbError ? dbError.code : undefined;
    if (code === '23505') throw ApiError.conflict('El alumno, usuario o correo ya tiene una cuenta');
    if (code === 'P0002' || code === '23503') throw ApiError.notFound('El alumno ya no existe');
    if (code === 'P0001') throw ApiError.badRequest('El correo del alumno cambió; vuelve a intentar la creación');
    throw dbError;
  }

  return { mensaje: 'Cuenta creada correctamente para el alumno.' };
}

export async function actualizarEstado(usuarioId: string, activo: boolean) {
  return repository.actualizarEstado(usuarioId, activo);
}

/** USR-03 — el admin restablece la contraseña de cualquier usuario (alumno o profesor). */
export async function resetearPassword(usuarioId: string, nuevaPassword: string) {
  const usuario = await repository.obtenerUsuarioPorId(usuarioId);
  if (!usuario) throw ApiError.notFound('No existe un usuario con ese id.');

  await repository.resetearPassword(usuarioId, nuevaPassword);
  return { mensaje: 'Contraseña restablecida correctamente.' };
}
