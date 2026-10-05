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

export async function getById(currentUser: AuthUser | undefined, id: string) {
  if (!currentUser) throw ApiError.unauthorized();

  const alumno = await repository.findById(id);
  if (!alumno) throw ApiError.notFound('Alumno no encontrado');

  if (currentUser.rol === 'ALU' && currentUser.estudianteId !== alumno.id) {
    throw ApiError.forbidden('No tienes acceso a este alumno');
  }

  return alumno;
}

export async function getByDni(currentUser: AuthUser | undefined, dni: string) {
  if (!currentUser) throw ApiError.unauthorized();

  if (currentUser.rol === 'ALU') {
    throw ApiError.forbidden('Los alumnos no pueden buscar alumnos por DNI');
  }

  const alumno = await repository.findByDni(dni);
  if (!alumno) throw ApiError.notFound('Alumno no encontrado');

  return alumno;
}

export async function create(currentUser: AuthUser | undefined, payload: Record<string, unknown>) {
  if (!currentUser) throw ApiError.unauthorized();
  if (currentUser.rol !== 'ADM') {
    throw ApiError.forbidden('Solo un administrador puede crear alumnos');
  }

  const dni = typeof payload.dni === 'string' ? payload.dni : '';
  const codigo = typeof payload.codigo === 'string' ? payload.codigo.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const telefono = typeof payload.telefono === 'string' ? payload.telefono : undefined;
  const categoriaId = typeof payload.categoriaId === 'string' ? payload.categoriaId : '';

  if (!/^\d{8}$/.test(dni)) {
    throw ApiError.badRequest('El DNI debe tener exactamente 8 dígitos');
  }

  if (!codigo) {
    throw ApiError.badRequest('El código es obligatorio');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw ApiError.badRequest('El email no es válido');
  }

  if (telefono !== undefined && !/^\d{9}$/.test(telefono)) {
    throw ApiError.badRequest('El teléfono debe tener exactamente 9 dígitos');
  }

  if (!categoriaId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoriaId)) {
    throw ApiError.badRequest('La categoría no es un UUID válido');
  }

  const [dniExists, codigoExists, emailExists, categoriaExists] = await Promise.all([
    repository.findByDni(dni),
    repository.findByCodigo(codigo),
    repository.findByEmail(email),
    repository.findCategoriaById(categoriaId),
  ]);

  if (dniExists) throw ApiError.conflict('DNI ya registrado');
  if (codigoExists) throw ApiError.conflict('Código ya registrado');
  if (emailExists) throw ApiError.conflict('Email ya registrado');
  if (!categoriaExists) throw ApiError.badRequest('La categoría especificada no existe');

  return repository.create({
    ...payload,
    dni,
    codigo,
    email,
    telefono: telefono ?? null,
    categoria_id: categoriaId,
    estado: payload.estado ?? 'activo',
  });
}

export async function update(id: string, payload: Record<string, unknown>) {
  return repository.update(id, payload);
}

export async function remove(id: string) {
  return repository.remove(id);
}
