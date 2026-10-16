import { ApiError } from '../../lib/errors/api-error';
import * as repository from './sedes.repository';

export async function list(filters: Record<string, unknown>) {
  return repository.findAll(filters);
}

export async function getById(id: string) {
  const sede = await repository.findById(id);
  if (!sede) throw ApiError.notFound('Sede no encontrada');
  return sede;
}

export async function create(payload: Record<string, unknown>) {
  return repository.create(payload);
}

export async function update(id: string, payload: Record<string, unknown>) {
  const sede = await repository.update(id, payload);
  if (!sede) throw ApiError.notFound('Sede no encontrada');
  return sede;
}

/** SED-05 — si la sede tiene profesores asignados, la base de datos rechaza
 *  el borrado (foreign key); lo traducimos a un 409 claro para el front. */
export async function remove(id: string) {
  let eliminada: boolean;
  try {
    eliminada = await repository.remove(id);
  } catch (err: any) {
    if (err?.code === '23503') {
      throw ApiError.conflict('No se puede eliminar: esta sede tiene profesores asignados.');
    }
    throw err;
  }
  if (!eliminada) throw ApiError.notFound('Sede no encontrada');
}
