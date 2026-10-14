import { ApiError } from '../../lib/errors/api-error';
import { PaginationParams } from '../../lib/utils/pagination';
import { AuthUser } from '../../types/express';
import * as repository from './evaluaciones.repository';
import { ActualizarEvaluacionInput, CrearEvaluacionInput } from './evaluaciones.schema';

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

// Misma regla de identidad que el módulo alumnos: profesores.id == auth id.
const profesorIdDe = (user: AuthUser) => user.profesorId ?? user.id;

/** ¿Puede este usuario ver/operar esta evaluación? ADM todo; ALU solo las suyas; PROF las de sus categorías. */
async function validarAcceso(user: AuthUser, evaluacion: { alumno_id: string; alumnos?: { categoria_id: string | null } | null }) {
  if (user.rol === 'ALU' && user.estudianteId !== evaluacion.alumno_id) {
    throw ApiError.forbidden('No tienes acceso a esta evaluación');
  }
  if (user.rol === 'PROF') {
    const categoriaIds = await repository.findCategoriaIdsByProfesor(profesorIdDe(user));
    const categoria = evaluacion.alumnos?.categoria_id;
    if (!categoria || !categoriaIds.includes(categoria)) {
      throw ApiError.forbidden('Solo puedes consultar evaluaciones de alumnos de tus categorías');
    }
  }
}

// EVA-01 — GET /evaluaciones
export async function list(user: AuthUser, query: Record<string, unknown>, pg: PaginationParams) {
  const filters: repository.EvaluacionFilters = {
    alumnoId: str(query.alumnoId),
    profesorId: str(query.profesorId),
    desde: str(query.desde),
    hasta: str(query.hasta),
  };

  if (user.rol === 'ALU') {
    if (!user.estudianteId) throw ApiError.forbidden('Tu cuenta no está vinculada a un alumno');
    filters.alumnoId = user.estudianteId; // ignora cualquier alumnoId que mande en la query
  }

  if (user.rol === 'PROF') {
    const categoriaIds = await repository.findCategoriaIdsByProfesor(profesorIdDe(user));
    if (categoriaIds.length === 0) return { data: [], meta: { page: pg.page, limit: pg.limit, total: 0 } };
    filters.categoriaIds = categoriaIds;
  }

  const { data, total } = await repository.findAll(filters, pg.from, pg.to);
  return { data, meta: { page: pg.page, limit: pg.limit, total } };
}

export async function getById(user: AuthUser, id: string) {
  const evaluacion = await repository.findById(id);
  if (!evaluacion) throw ApiError.notFound('Evaluación no encontrada');
  await validarAcceso(user, evaluacion);
  return evaluacion;
}

// EVA-02 — POST /evaluaciones
export async function create(user: AuthUser, body: CrearEvaluacionInput) {
  const alumno = await repository.findAlumno(body.alumnoId);
  if (!alumno) throw ApiError.unprocessable('El alumno indicado no existe');

  let profesorId = body.profesorId;
  if (user.rol === 'PROF') {
    profesorId = profesorIdDe(user); // el profesor siempre firma con su propio id
    const categoriaIds = await repository.findCategoriaIdsByProfesor(profesorId);
    if (!alumno.categoria_id || !categoriaIds.includes(alumno.categoria_id)) {
      throw ApiError.forbidden('Solo puedes evaluar alumnos de tus categorías asignadas');
    }
  } else if (!profesorId) {
    throw ApiError.badRequest('Como administrador debes indicar profesorId');
  }

  return repository.create({
    alumno_id: body.alumnoId,
    profesor_id: profesorId,
    fecha: body.fecha,
    rendimiento_tecnico: body.rendimientoTecnico,
    rendimiento_fisico: body.rendimientoFisico,
    actitud: body.actitud,
    observaciones: body.observaciones,
  });
}

// EVA-03 — PUT /evaluaciones/:id
export async function update(user: AuthUser, id: string, body: ActualizarEvaluacionInput) {
  const cambios: Record<string, unknown> = {};
  if (body.fecha !== undefined) cambios.fecha = body.fecha;
  if (body.rendimientoTecnico !== undefined) cambios.rendimiento_tecnico = body.rendimientoTecnico;
  if (body.rendimientoFisico !== undefined) cambios.rendimiento_fisico = body.rendimientoFisico;
  if (body.actitud !== undefined) cambios.actitud = body.actitud;
  if (body.observaciones !== undefined) cambios.observaciones = body.observaciones;
  if (Object.keys(cambios).length === 0) throw ApiError.badRequest('No enviaste ningún campo para actualizar');

  const existente = await repository.findById(id);
  if (!existente) throw ApiError.notFound('Evaluación no encontrada');

  // Un profesor solo corrige evaluaciones que él mismo registró.
  if (user.rol === 'PROF' && existente.profesor_id !== profesorIdDe(user)) {
    throw ApiError.forbidden('Solo puedes editar tus propias evaluaciones');
  }

  const actualizada = await repository.update(id, cambios);
  if (!actualizada) throw ApiError.notFound('Evaluación no encontrada');
  return actualizada;
}

export async function remove(id: string) {
  return repository.remove(id);
}
