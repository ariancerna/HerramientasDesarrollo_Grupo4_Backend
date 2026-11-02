import { ApiError } from '../../lib/errors/api-error';
import type { AuthUser } from '../../types/express';
import { findCategoriaIdsByProfesor } from '../alumnos/alumnos.repository';
import * as repository from './evaluaciones.repository';
import type { EvaluacionRow } from './evaluaciones.repository';
import type { CambiosEvaluacion, FiltroEvaluaciones, NuevaEvaluacion } from './evaluaciones.schema';

const profesorDe = (usuario: AuthUser) => usuario.profesorId ?? usuario.id;

async function presentar(rows: EvaluacionRow[]) {
  const nombres = await repository.nombres(rows.map((row) => row.alumno_id), rows.map((row) => row.profesor_id));
  return rows.map((row) => ({
    id: row.id,
    alumnoId: row.alumno_id,
    alumno: nombres.alumnos.get(row.alumno_id) ?? null,
    profesorId: row.profesor_id,
    profesor: nombres.profesores.get(row.profesor_id) ?? null,
    fecha: row.fecha,
    rendimientoTecnico: row.rendimiento_tecnico,
    rendimientoFisico: row.rendimiento_fisico,
    actitud: row.actitud,
    observaciones: row.observaciones,
    createdAt: row.created_at,
  }));
}

/** El profesor solo evalúa alumnos de sus categorías (regla de negocio #4). */
async function validarAlumno(usuario: AuthUser, alumnoId: string) {
  const alumno = await repository.findAlumno(alumnoId);
  if (!alumno) throw ApiError.notFound('Alumno no encontrado');
  const categorias = await findCategoriaIdsByProfesor(profesorDe(usuario));
  if (!alumno.categoria_id || !categorias.includes(alumno.categoria_id)) {
    throw ApiError.forbidden('Solo puedes evaluar alumnos de tus categorías');
  }
}

async function propia(usuario: AuthUser, id: string) {
  const evaluacion = await repository.findById(id);
  if (!evaluacion) throw ApiError.notFound('Evaluación no encontrada');
  if (evaluacion.profesor_id !== profesorDe(usuario)) {
    throw ApiError.forbidden('Solo el autor puede modificar esta evaluación');
  }
  return evaluacion;
}

function errorBaseDatos(error: unknown): never {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
    throw ApiError.forbidden('Tu cuenta no tiene un perfil de profesor válido');
  }
  throw error;
}

/** EVA-01 — PROF ve las suyas, ADM todas; fecha más reciente primero. */
export async function listar(usuario: AuthUser, filtro: FiltroEvaluaciones) {
  const from = (filtro.page - 1) * filtro.limit;
  const { rows, total } = await repository.findAll({
    profesorId: usuario.rol === 'PROF' ? profesorDe(usuario) : undefined,
    alumnoId: filtro.alumnoId, desde: filtro.desde, hasta: filtro.hasta,
    from, to: from + filtro.limit - 1,
  });
  return { data: await presentar(rows), meta: { page: filtro.page, limit: filtro.limit, total } };
}

/** EVA-02 — el profesorId sale del token, nunca del cuerpo. */
export async function crear(usuario: AuthUser, body: NuevaEvaluacion) {
  await validarAlumno(usuario, body.alumnoId);
  try {
    return (await presentar([await repository.create(profesorDe(usuario), body)]))[0];
  } catch (error) { return errorBaseDatos(error); }
}

/** EVA-03 */
export async function editar(usuario: AuthUser, id: string, body: CambiosEvaluacion) {
  await propia(usuario, id);
  if (body.alumnoId) await validarAlumno(usuario, body.alumnoId);
  const row = await repository.update(id, body);
  if (!row) throw ApiError.notFound('Evaluación no encontrada');
  return (await presentar([row]))[0];
}

/** EVA-04 */
export async function eliminar(usuario: AuthUser, id: string) {
  await propia(usuario, id);
  await repository.remove(id);
}
