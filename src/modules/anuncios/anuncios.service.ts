import { ApiError } from '../../lib/errors/api-error';
import { PaginationParams } from '../../lib/utils/pagination';
import { AuthUser } from '../../types/express';
import * as repository from './anuncios.repository';
import { ActualizarAnuncioInput, CrearAnuncioInput } from './anuncios.schema';

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const unicos = (ids: string[]) => [...new Set(ids)];

// Misma regla de identidad que el módulo alumnos: profesores.id == auth id.
const profesorIdDe = (user: AuthUser) => user.profesorId ?? user.id;

/** Un PROF solo puede dirigirse a categorías y alumnos de sus categorías asignadas. */
async function validarAlcanceProfesor(user: AuthUser, categoriaId?: string, alumnoIds?: string[]) {
  if (user.rol !== 'PROF') return;
  const permitidas = await repository.findCategoriaIdsByProfesor(profesorIdDe(user));

  if (categoriaId && !permitidas.includes(categoriaId)) {
    throw ApiError.forbidden('Solo puedes publicar anuncios para tus categorías asignadas');
  }
  if (alumnoIds?.length) {
    const alumnos = await repository.findAlumnosByIds(alumnoIds);
    if (alumnos.some((a) => !a.categoria_id || !permitidas.includes(a.categoria_id))) {
      throw ApiError.forbidden('Solo puedes dirigirte a alumnos de tus categorías asignadas');
    }
  }
}

/** Verifica que todos los alumnoIds existan (si no, el INSERT fallaría tarde y con un error opaco). */
async function validarAlumnosExisten(alumnoIds: string[]) {
  if (alumnoIds.length === 0) return;
  const encontrados = await repository.findAlumnosByIds(alumnoIds);
  if (encontrados.length !== alumnoIds.length) throw ApiError.unprocessable('Algún alumno indicado en alumnoIds no existe');
}

// ANU-01 — GET /anuncios
export async function list(user: AuthUser, query: Record<string, unknown>, pg: PaginationParams) {
  const filters: repository.AnuncioFilters = {
    categoriaId: str(query.categoriaId),
    estado: str(query.estado),
    profesorId: str(query.profesorId),
  };

  if (user.rol === 'PROF') filters.profesorId = profesorIdDe(user); // solo los que él publicó
  if (user.rol === 'ALU') {
    if (!user.estudianteId) throw ApiError.forbidden('Tu cuenta no está vinculada a un alumno');
    filters.destinatarioAlumnoId = user.estudianteId; // solo los dirigidos a él…
    filters.estado = 'enviado'; // …y nunca los borradores
  }

  const { data, total } = await repository.findAll(filters, pg.from, pg.to);
  return { data, meta: { page: pg.page, limit: pg.limit, total } };
}

export async function getById(user: AuthUser, id: string) {
  const anuncio = await repository.findById(id);
  if (!anuncio) throw ApiError.notFound('Anuncio no encontrado');

  if (user.rol === 'PROF' && anuncio.profesor_id !== profesorIdDe(user)) {
    throw ApiError.forbidden('Solo puedes consultar tus propios anuncios');
  }
  if (user.rol === 'ALU') {
    const visible =
      anuncio.estado === 'enviado' && user.estudianteId && (await repository.esDestinatario(id, user.estudianteId));
    if (!visible) throw ApiError.notFound('Anuncio no encontrado'); // 404 y no 403: no revelamos que existe
    return anuncio;
  }
  return { ...anuncio, alumno_ids: await repository.findDestinatarios(id) };
}

// ANU-02 — POST /anuncios
export async function create(user: AuthUser, body: CrearAnuncioInput) {
  const { alumnoIds, profesorId: profesorIdBody, categoriaId, estado, titulo, mensaje } = body;

  let profesorId = profesorIdBody;
  if (user.rol === 'PROF') profesorId = profesorIdDe(user);
  else if (!profesorId) throw ApiError.badRequest('Como administrador debes indicar profesorId');

  const explicitos = alumnoIds ? unicos(alumnoIds) : undefined;
  await validarAlcanceProfesor(user, categoriaId, explicitos);
  if (explicitos) await validarAlumnosExisten(explicitos);

  // Destinatarios: los indicados o, por defecto, todos los alumnos activos de la categoría.
  const destinatarios = explicitos ?? (categoriaId ? await repository.findAlumnoIdsActivosByCategoria(categoriaId) : []);

  // El dashboard del alumno solo muestra anuncios "enviado" que tengan destinatarios.
  if (estado === 'enviado' && destinatarios.length === 0) {
    throw ApiError.badRequest('Para enviar un anuncio indica una categoría con alumnos activos o una lista alumnoIds');
  }

  const anuncio = await repository.create({
    profesor_id: profesorId,
    titulo,
    mensaje,
    categoria_id: categoriaId ?? null,
    estado,
  });

  try {
    await repository.reemplazarDestinatarios(anuncio.id, destinatarios);
  } catch (err) {
    // supabase-js no tiene transacciones: si falla el 2º paso, deshacemos el 1º a mano.
    await repository.remove(anuncio.id);
    throw err;
  }

  return { ...anuncio, alumno_ids: destinatarios };
}

// ANU-03 — PUT /anuncios/:id
export async function update(user: AuthUser, id: string, body: ActualizarAnuncioInput) {
  const { alumnoIds, categoriaId, estado, titulo, mensaje } = body;

  const cambios: Record<string, unknown> = {};
  if (titulo !== undefined) cambios.titulo = titulo;
  if (mensaje !== undefined) cambios.mensaje = mensaje;
  if (categoriaId !== undefined) cambios.categoria_id = categoriaId;
  if (estado !== undefined) cambios.estado = estado;
  if (Object.keys(cambios).length === 0 && alumnoIds === undefined) {
    throw ApiError.badRequest('No enviaste ningún campo para actualizar');
  }

  const existente = await repository.findById(id);
  if (!existente) throw ApiError.notFound('Anuncio no encontrado');
  if (user.rol === 'PROF' && existente.profesor_id !== profesorIdDe(user)) {
    throw ApiError.forbidden('Solo puedes editar tus propios anuncios');
  }

  const explicitos = alumnoIds ? unicos(alumnoIds) : undefined;
  await validarAlcanceProfesor(user, categoriaId, explicitos);
  if (explicitos) await validarAlumnosExisten(explicitos);

  // ¿Cambian los destinatarios? Si mandó alumnoIds, esos; si cambió la categoría, los de la nueva; si no, quedan igual.
  let nuevosDestinatarios: string[] | undefined = explicitos;
  if (!nuevosDestinatarios && categoriaId && categoriaId !== existente.categoria_id) {
    nuevosDestinatarios = await repository.findAlumnoIdsActivosByCategoria(categoriaId);
  }

  // Si queda "enviado", debe tener a quién llegar (mismo criterio que al crear).
  const estadoFinal = estado ?? existente.estado;
  if (estadoFinal === 'enviado') {
    const quedan = nuevosDestinatarios ?? (await repository.findDestinatarios(id));
    if (quedan.length === 0) {
      const categoriaFinal = categoriaId ?? existente.categoria_id;
      nuevosDestinatarios = categoriaFinal ? await repository.findAlumnoIdsActivosByCategoria(categoriaFinal) : [];
      if (nuevosDestinatarios.length === 0) {
        throw ApiError.badRequest('Un anuncio enviado necesita una categoría con alumnos activos o una lista alumnoIds');
      }
    }
  }

  const anuncio = Object.keys(cambios).length > 0 ? await repository.update(id, cambios) : existente;
  if (!anuncio) throw ApiError.notFound('Anuncio no encontrado');
  if (nuevosDestinatarios) await repository.reemplazarDestinatarios(id, nuevosDestinatarios);

  return { ...anuncio, alumno_ids: nuevosDestinatarios ?? (await repository.findDestinatarios(id)) };
}

export async function remove(id: string) {
  return repository.remove(id);
}
