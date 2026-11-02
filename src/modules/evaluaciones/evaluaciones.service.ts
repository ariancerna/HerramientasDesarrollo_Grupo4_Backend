import { ApiError } from '../../lib/errors/api-error';
import { AuthUser } from '../../types/express';
import * as repository from './evaluaciones.repository';
import { CambiosEvaluacion, NuevaEvaluacion } from './evaluaciones.schema';

function profesorDe(user: AuthUser) {
  return user.profesorId ?? user.id;
}

/** ADM ve todas; PROF, las que registró; ALU, solo las suyas. */
export async function list(user: AuthUser) {
  if (user.rol === 'PROF') return repository.findAll({ profesorId: profesorDe(user) });
  if (user.rol === 'ALU') {
    if (!user.estudianteId) return [];
    return repository.findAll({ alumnoId: user.estudianteId });
  }
  return repository.findAll();
}

export async function getById(user: AuthUser, id: string) {
  const evaluacion = await repository.findById(id);
  if (!evaluacion) throw ApiError.notFound('Evaluación no encontrada');

  const esDelProfesor = user.rol === 'PROF' && evaluacion.profesorId === profesorDe(user);
  const esDelAlumno = user.rol === 'ALU' && evaluacion.alumnoId === user.estudianteId;
  if (user.rol !== 'ADM' && !esDelProfesor && !esDelAlumno) {
    throw ApiError.forbidden('No tienes acceso a esta evaluación');
  }
  return evaluacion;
}

/** Solo el profesor que la registró puede modificarla o eliminarla. */
async function propia(user: AuthUser, id: string) {
  const evaluacion = await repository.findById(id);
  if (!evaluacion) throw ApiError.notFound('Evaluación no encontrada');
  if (evaluacion.profesorId !== profesorDe(user)) {
    throw ApiError.forbidden('Solo el profesor que registró la evaluación puede modificarla');
  }
  return evaluacion;
}

export async function create(user: AuthUser, payload: NuevaEvaluacion) {
  return repository.create(profesorDe(user), payload);
}

export async function update(user: AuthUser, id: string, payload: CambiosEvaluacion) {
  await propia(user, id);
  return repository.update(id, payload);
}

export async function remove(user: AuthUser, id: string) {
  await propia(user, id);
  return repository.remove(id);
}
