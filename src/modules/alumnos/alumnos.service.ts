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

export async function getProfile(currentUser: AuthUser | undefined, alumnoId: string) {
  if (!currentUser) throw ApiError.unauthorized();
  if (!currentUser.estudianteId || currentUser.estudianteId !== alumnoId) {
    throw ApiError.forbidden('Solo puedes consultar tu propio perfil');
  }

  const perfil = await repository.findProfileByAlumnoId(alumnoId);
  if (!perfil) throw ApiError.notFound('Perfil no encontrado');

  return perfil;
}

export async function updateProfile(currentUser: AuthUser | undefined, alumnoId: string, payload: Record<string, unknown>) {
  if (!currentUser) throw ApiError.unauthorized();
  if (currentUser.rol !== 'ALU' || currentUser.estudianteId !== alumnoId) {
    throw ApiError.forbidden('Solo puedes actualizar tu propio perfil');
  }

  const forbiddenFields = ['id', 'dni', 'codigo', 'categoriaId', 'estado', 'password'];
  const forbidden = Object.keys(payload).find((field) => forbiddenFields.includes(field));
  if (forbidden) {
    throw ApiError.badRequest(`No se permite modificar el campo ${forbidden}`);
  }

  const allowedFields = ['nombres', 'apellidos', 'email', 'telefono'];
  const invalidFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));
  if (invalidFields.length > 0) {
    throw ApiError.badRequest(`Campos no permitidos: ${invalidFields.join(', ')}`);
  }

  const alumno = await repository.findById(alumnoId);
  if (!alumno) throw ApiError.notFound('Perfil no encontrado');

  const updatePayload: Record<string, unknown> = {};

  if (payload.nombres !== undefined) {
    const nombres = String(payload.nombres).trim();
    if (!nombres) throw ApiError.badRequest('Los nombres son obligatorios');
    updatePayload.nombres = nombres;
  }

  if (payload.apellidos !== undefined) {
    const apellidos = String(payload.apellidos).trim();
    if (!apellidos) throw ApiError.badRequest('Los apellidos son obligatorios');
    updatePayload.apellidos = apellidos;
  }

  if (payload.email !== undefined) {
    const email = String(payload.email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw ApiError.badRequest('El email no es válido');
    }
    if (alumno.email !== email) {
      const existente = await repository.findByEmail(email);
      if (existente) throw ApiError.conflict('Email ya registrado');
    }
    updatePayload.email = email;
  }

  if (payload.telefono !== undefined) {
    const telefono = String(payload.telefono);
    if (!/^\d{9}$/.test(telefono)) {
      throw ApiError.badRequest('El teléfono debe tener exactamente 9 dígitos');
    }
    updatePayload.telefono = telefono;
  }

  if (Object.keys(updatePayload).length === 0) {
    return alumno;
  }

  return repository.update(alumnoId, updatePayload);
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

export async function update(currentUser: AuthUser | undefined, id: string, payload: Record<string, unknown>) {
  if (!currentUser) throw ApiError.unauthorized();
  if (currentUser.rol !== 'ADM') {
    throw ApiError.forbidden('Solo un administrador puede editar alumnos');
  }

  const forbiddenFields = ['id', 'password', 'estado'];
  const forbidden = Object.keys(payload).find((field) => forbiddenFields.includes(field));
  if (forbidden) {
    throw ApiError.badRequest(`No se permite modificar el campo ${forbidden}`);
  }

  const allowedFields = ['nombres', 'apellidos', 'dni', 'email', 'telefono', 'codigo', 'categoriaId'];
  const invalidFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));
  if (invalidFields.length > 0) {
    throw ApiError.badRequest(`Campos no permitidos: ${invalidFields.join(', ')}`);
  }

  const alumno = await repository.findById(id);
  if (!alumno) throw ApiError.notFound('Alumno no encontrado');

  const updatePayload: Record<string, unknown> = {};

  if (payload.nombres !== undefined) {
    const nombres = String(payload.nombres).trim();
    if (!nombres) throw ApiError.badRequest('Los nombres son obligatorios');
    updatePayload.nombres = nombres;
  }

  if (payload.apellidos !== undefined) {
    const apellidos = String(payload.apellidos).trim();
    if (!apellidos) throw ApiError.badRequest('Los apellidos son obligatorios');
    updatePayload.apellidos = apellidos;
  }

  if (payload.dni !== undefined) {
    const dni = String(payload.dni);
    if (!/^\d{8}$/.test(dni)) {
      throw ApiError.badRequest('El DNI debe tener exactamente 8 dígitos');
    }
    if (alumno.dni !== dni) {
      const existente = await repository.findByDni(dni);
      if (existente) throw ApiError.conflict('DNI ya registrado');
    }
    updatePayload.dni = dni;
  }

  if (payload.email !== undefined) {
    const email = String(payload.email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw ApiError.badRequest('El email no es válido');
    }
    if (alumno.email !== email) {
      const existente = await repository.findByEmail(email);
      if (existente) throw ApiError.conflict('Email ya registrado');
    }
    updatePayload.email = email;
  }

  if (payload.telefono !== undefined) {
    const telefono = String(payload.telefono);
    if (!/^\d{9}$/.test(telefono)) {
      throw ApiError.badRequest('El teléfono debe tener exactamente 9 dígitos');
    }
    updatePayload.telefono = telefono;
  }

  if (payload.codigo !== undefined) {
    const codigo = String(payload.codigo).trim();
    if (!codigo) throw ApiError.badRequest('El código es obligatorio');
    if (alumno.codigo !== codigo) {
      const existente = await repository.findByCodigo(codigo);
      if (existente) throw ApiError.conflict('Código ya registrado');
    }
    updatePayload.codigo = codigo;
  }

  if (payload.categoriaId !== undefined) {
    const categoriaId = String(payload.categoriaId);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoriaId)) {
      throw ApiError.badRequest('La categoría no es un UUID válido');
    }
    const categoria = await repository.findCategoriaById(categoriaId);
    if (!categoria) throw ApiError.badRequest('La categoría especificada no existe');
    updatePayload.categoria_id = categoriaId;
  }

  if (Object.keys(updatePayload).length === 0) {
    return alumno;
  }

  return repository.update(id, updatePayload);
}

export async function updateState(currentUser: AuthUser | undefined, id: string, payload: Record<string, unknown>) {
  if (!currentUser) throw ApiError.unauthorized();
  if (currentUser.rol !== 'ADM') {
    throw ApiError.forbidden('Solo un administrador puede cambiar el estado del alumno');
  }

  const estado = payload.estado;
  if (estado !== 'activo' && estado !== 'inactivo') {
    throw ApiError.badRequest('El estado debe ser "activo" o "inactivo"');
  }

  const alumno = await repository.findById(id);
  if (!alumno) throw ApiError.notFound('Alumno no encontrado');

  return repository.update(id, { estado });
}

export async function remove(currentUser: AuthUser | undefined, id: string) {
  if (!currentUser) throw ApiError.unauthorized();
  if (currentUser.rol !== 'ADM') {
    throw ApiError.forbidden('Solo un administrador puede eliminar alumnos');
  }

  const alumno = await repository.findById(id);
  if (!alumno) throw ApiError.notFound('Alumno no encontrado');

  if (alumno.estado === 'inactivo') {
    return alumno;
  }

  return repository.update(id, { estado: 'inactivo' });
}
