import { ApiError } from '../../lib/errors/api-error';
import { AuthUser } from '../../types/express';
import * as repository from './anuncios.repository';
import { CambiosAnuncio, NuevoAnuncio } from './anuncios.schema';

function profesorDe(user: AuthUser) {
  return user.profesorId ?? user.id;
}

/** ADM ve todos; PROF, los que redactó; ALU, los enviados a él. */
export async function list(user: AuthUser) {
  if (user.rol === 'PROF') return repository.findAll({ profesorId: profesorDe(user) });
  if (user.rol === 'ALU') {
    if (!user.estudianteId) return [];
    return repository.findAll({ alumnoId: user.estudianteId });
  }
  return repository.findAll();
}

export async function getById(user: AuthUser, id: string) {
  const anuncio = await repository.findById(id);
  if (!anuncio) throw ApiError.notFound('Anuncio no encontrado');

  const esDelProfesor = user.rol === 'PROF' && anuncio.profesorId === profesorDe(user);
  const esParaElAlumno =
    user.rol === 'ALU' && anuncio.estado === 'enviado' && anuncio.destinatarios.includes(user.estudianteId);
  if (user.rol !== 'ADM' && !esDelProfesor && !esParaElAlumno) {
    throw ApiError.forbidden('No tienes acceso a este anuncio');
  }
  return anuncio;
}

/** Solo el profesor que lo redactó puede modificarlo o eliminarlo. */
async function propio(user: AuthUser, id: string) {
  const anuncio = await repository.findById(id);
  if (!anuncio) throw ApiError.notFound('Anuncio no encontrado');
  if (anuncio.profesorId !== profesorDe(user)) {
    throw ApiError.forbidden('Solo el profesor que redactó el anuncio puede modificarlo');
  }
  return anuncio;
}

export async function create(user: AuthUser, payload: NuevoAnuncio) {
  return repository.create(profesorDe(user), payload);
}

export async function update(user: AuthUser, id: string, payload: CambiosAnuncio) {
  await propio(user, id);
  return repository.update(id, payload);
}

export async function remove(user: AuthUser, id: string) {
  await propio(user, id);
  return repository.remove(id);
}
