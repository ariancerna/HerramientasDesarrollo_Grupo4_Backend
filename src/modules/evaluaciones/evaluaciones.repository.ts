import { PostgrestError } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';
import * as alumnosRepository from '../alumnos/alumnos.repository';

const TABLE = 'evaluaciones';
// "!inner" = INNER JOIN: permite filtrar evaluaciones por datos del alumno (su categoría).
const SELECT = '*, alumnos!inner(nombres, apellidos, categoria_id)';

export interface EvaluacionFilters {
  alumnoId?: string;
  profesorId?: string;
  categoriaIds?: string[]; // alcance del profesor: solo alumnos de estas categorías
  desde?: string; // fecha >= desde
  hasta?: string; // fecha <= hasta
}

/** Traduce errores de Postgres a errores HTTP; si no, el cliente recibiría un 500 genérico. */
function handleDbError(error: PostgrestError): never {
  if (error.code === '23503') throw ApiError.unprocessable('El alumno o el profesor indicado no existe');
  if (error.code === '22P02') throw ApiError.badRequest('Un identificador tiene formato inválido');
  throw error;
}

export async function findCategoriaIdsByProfesor(profesorId: string) {
  return alumnosRepository.findCategoriaIdsByProfesor(profesorId);
}

export async function findAlumno(alumnoId: string) {
  const { data, error } = await supabaseAdmin.from('alumnos').select('id, categoria_id').eq('id', alumnoId).maybeSingle();
  if (error) handleDbError(error);
  return data as { id: string; categoria_id: string | null } | null;
}

export async function findAll(filters: EvaluacionFilters, from: number, to: number) {
  let query = supabaseAdmin
    .from(TABLE)
    .select(SELECT, { count: 'exact' })
    .order('fecha', { ascending: false })
    .order('id') // desempate estable para que la paginación no repita ni salte filas
    .range(from, to);

  if (filters.alumnoId) query = query.eq('alumno_id', filters.alumnoId);
  if (filters.profesorId) query = query.eq('profesor_id', filters.profesorId);
  if (filters.categoriaIds) query = query.in('alumnos.categoria_id', filters.categoriaIds);
  if (filters.desde) query = query.gte('fecha', filters.desde);
  if (filters.hasta) query = query.lte('fecha', filters.hasta);

  const { data, error, count } = await query;
  if (error) handleDbError(error);
  return { data: data ?? [], total: count ?? 0 };
}

export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).select(SELECT).eq('id', id).maybeSingle();
  if (error) handleDbError(error);
  return data ?? null;
}

export async function create(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from(TABLE).insert(payload).select(SELECT).single();
  if (error) handleDbError(error);
  return data;
}

export async function update(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from(TABLE).update(payload).eq('id', id).select(SELECT).maybeSingle();
  if (error) handleDbError(error);
  return data ?? null;
}

export async function remove(id: string) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
  if (error) handleDbError(error);
}
