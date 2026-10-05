import { ApiError } from '../../lib/errors/api-error';
import { getPagination } from '../../lib/utils/pagination';
import { AuthUser } from '../../types/express';
import * as repository from './alumnos.repository';

export interface ListAlumnosFilters {
  texto?: string;
  categoriaId?: string;
  estado?: 'activo' | 'inactivo';
  page?: number;
  limit?: number;
}

export async function list(currentUser: AuthUser | undefined, filters: Record<string, unknown>) {
  if (!currentUser) throw ApiError.unauthorized();

  if (currentUser.rol === 'ALU') {
    throw ApiError.forbidden('Los alumnos no pueden consultar la lista de alumnos');
  }

  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 20);
  const normalizedFilters: ListAlumnosFilters = {
    texto: typeof filters.texto === 'string' ? filters.texto.trim() : undefined,
    categoriaId: typeof filters.categoriaId === 'string' ? filters.categoriaId : undefined,
    estado: filters.estado === 'inactivo' || filters.estado === 'activo' ? filters.estado : undefined,
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 20,
  };

  const pagination = getPagination({ query: normalizedFilters } as never, 20, 100);
  const categoriaIds = currentUser.rol === 'PROF'
    ? await repository.findCategoriaIdsByProfesor(currentUser.profesorId)
    : [];

  if (currentUser.rol === 'PROF' && categoriaIds.length === 0) {
    return {
      data: [],
      page: pagination.page,
      limit: pagination.limit,
      total: 0,
      totalPages: 0,
    };
  }

  return repository.findAll({
    ...normalizedFilters,
    page: pagination.page,
    limit: pagination.limit,
    from: pagination.from,
    to: pagination.to,
    categoriaIds,
  });
}

export async function getById(id: string) {
  return repository.findById(id);
}

export async function create(payload: Record<string, unknown>) {
  return repository.create(payload);
}

export async function update(id: string, payload: Record<string, unknown>) {
  return repository.update(id, payload);
}

export async function remove(id: string) {
  return repository.remove(id);
}
