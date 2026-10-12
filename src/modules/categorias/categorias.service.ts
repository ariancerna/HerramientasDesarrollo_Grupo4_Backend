import { ApiError } from '../../lib/errors/api-error';
import * as repository from './categorias.repository';
export async function list(filters: Record<string, unknown>) { return repository.findAll(filters); }
export async function getById(id: string) {
  const categoria = await repository.findById(id);
  if (!categoria) throw ApiError.notFound('Categoría no encontrada');
  return categoria;
}
export async function create(payload: Record<string, unknown>) { return repository.create(payload); }
export async function update(id: string, payload: Record<string, unknown>) {
  const categoria = await repository.update(id, payload);
  if (!categoria) throw ApiError.notFound('Categoría no encontrada');
  return categoria;
}
export async function remove(id: string) {
  try {
    const categoria = await repository.remove(id);
    if (!categoria) throw ApiError.notFound('Categoría no encontrada');
  } catch (error: any) {
    if (error?.code === '23503') throw ApiError.conflict('La categoría tiene alumnos u otros registros asociados');
    throw error;
  }
}
