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
    throw ApiError.badRequest(error?.message ?? 'No se pudo crear la cuenta');
  }

  await repository.insertarUsuario({
    id: data.user.id,
    usuario,
    email: alumno.email,
    nombre: nombreCompleto,
    estudianteId: alumnoId,
  });

  return { mensaje: 'Cuenta creada correctamente para el alumno.' };
}

export async function actualizarEstado(usuarioId: string, activo: boolean) {
  return repository.actualizarEstado(usuarioId, activo);
}

export async function resetearPassword(usuarioId: string, nuevaPassword: string) {
  return repository.resetearPassword(usuarioId, nuevaPassword);
}