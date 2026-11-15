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

export async function actualizarEstado(usuarioId: string, activo: boolean, solicitanteId?: string) {
  if (usuarioId === solicitanteId && !activo) {
    throw ApiError.badRequest('No puedes bloquear tu propia cuenta.');
  }
  const usuario = await repository.actualizarEstado(usuarioId, activo);
  if (!usuario) throw ApiError.notFound('No existe un usuario con ese id.');
  const { id, usuario: nombreUsuario, nombre, rol, activo: estado } = usuario;
  return { id, usuario: nombreUsuario, nombre, rol, activo: estado };
}

/** USR-03 — el admin restablece la contraseña de cualquier usuario (alumno o profesor). */
export async function resetearPassword(usuarioId: string, nuevaPassword: string) {
  const usuario = await repository.obtenerUsuarioPorId(usuarioId);
  if (!usuario) throw ApiError.notFound('No existe un usuario con ese id.');

  await repository.resetearPassword(usuarioId, nuevaPassword);
  return { mensaje: 'Contraseña restablecida correctamente.' };
}

type RolUsuario = 'ADM' | 'PROF' | 'ALU';

/** USR-04 — listado de todas las cuentas con su rol, categorías y datos de acceso. */
export async function listarUsuarios() {
  const usuarios = await repository.listarUsuarios();
  const alumnoIds = usuarios.map((u) => u.estudiante_id).filter((id): id is string => Boolean(id));
  const profesorIds = usuarios.map((u) => u.profesor_id).filter((id): id is string => Boolean(id));

  const [deAlumnos, deProfesores, acceso] = await Promise.all([
    repository.categoriasDeAlumnos(alumnoIds),
    repository.categoriasDeProfesores(profesorIds),
    // Si Supabase Auth no responde, la lista se muestra igual sin último ingreso.
    repository.datosDeAcceso().catch(() => new Map<string, { ultimoAcceso: string | null; proveedores: string[] }>()),
  ]);

  return usuarios.map((u) => {
    const categorias =
      u.rol === 'ALU' && u.estudiante_id ? [deAlumnos.get(u.estudiante_id)].filter((n): n is string => Boolean(n))
        : u.rol === 'PROF' && u.profesor_id ? deProfesores.get(u.profesor_id) ?? []
          : [];
    const datos = acceso.get(u.id);
    return {
      id: u.id as string,
      usuario: u.usuario as string,
      nombre: u.nombre as string,
      email: u.email as string,
      rol: u.rol as RolUsuario,
      activo: u.activo !== false,
      createdAt: u.created_at as string,
      categorias,
      ultimoAcceso: datos?.ultimoAcceso ?? null,
      proveedores: datos?.proveedores ?? [],
    };
  });
}

/** Categorías del usuario en sesión (menú lateral). El admin no tiene: ve todas. */
export async function categoriasDeSesion(usuario: { rol: string; estudianteId?: string; profesorId?: string }) {
  if (usuario.rol === 'ALU' && usuario.estudianteId) {
    const nombre = (await repository.categoriasDeAlumnos([usuario.estudianteId])).get(usuario.estudianteId);
    return nombre ? [nombre] : [];
  }
  if (usuario.rol === 'PROF' && usuario.profesorId) {
    return (await repository.categoriasDeProfesores([usuario.profesorId])).get(usuario.profesorId) ?? [];
  }
  return [];
}
