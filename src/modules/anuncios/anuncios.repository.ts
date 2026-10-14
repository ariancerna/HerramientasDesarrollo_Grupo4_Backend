import { PostgrestError } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';
import * as alumnosRepository from '../alumnos/alumnos.repository';

const TABLE = 'anuncios';
const TABLE_DEST = 'anuncios_destinatarios';

export interface AnuncioFilters {
  categoriaId?: string;
  estado?: string;
  profesorId?: string;
  /** Si viene, solo devuelve anuncios dirigidos a ese alumno (vía anuncios_destinatarios). */
  destinatarioAlumnoId?: string;
}

function handleDbError(error: PostgrestError): never {
  if (error.code === '23503') throw ApiError.unprocessable('La categoría, el profesor o algún alumno indicado no existe');
  if (error.code === '22P02') throw ApiError.badRequest('Un identificador tiene formato inválido');
  throw error;
}

export async function findCategoriaIdsByProfesor(profesorId: string) {
  return alumnosRepository.findCategoriaIdsByProfesor(profesorId);
}

export async function findAll(filters: AnuncioFilters, from: number, to: number) {
  // "!inner" = INNER JOIN: solo trae anuncios que tengan como destinatario a ese alumno.
  const select = filters.destinatarioAlumnoId ? '*, anuncios_destinatarios!inner(alumno_id)' : '*';

  let query = supabaseAdmin
    .from(TABLE)
    .select(select, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to);

  if (filters.categoriaId) query = query.eq('categoria_id', filters.categoriaId);
  if (filters.estado) query = query.eq('estado', filters.estado);
  if (filters.profesorId) query = query.eq('profesor_id', filters.profesorId);
  if (filters.destinatarioAlumnoId) query = query.eq('anuncios_destinatarios.alumno_id', filters.destinatarioAlumnoId);

  const { data, error, count } = await query;
  if (error) handleDbError(error);

  // El join solo servía para filtrar: no lo exponemos en la respuesta.
  const filas = ((data ?? []) as unknown as Record<string, unknown>[]).map((fila) => {
    const { anuncios_destinatarios: _join, ...anuncio } = fila;
    return anuncio;
  });
  return { data: filas, total: count ?? 0 };
}

export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) handleDbError(error);
  return data ?? null;
}

export async function create(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from(TABLE).insert(payload).select().single();
  if (error) handleDbError(error);
  return data;
}

export async function update(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from(TABLE).update(payload).eq('id', id).select().maybeSingle();
  if (error) handleDbError(error);
  return data ?? null;
}

export async function remove(id: string) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
  if (error) handleDbError(error);
}

// ---- Alumnos / destinatarios ------------------------------------------------

export async function findAlumnosByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabaseAdmin.from('alumnos').select('id, categoria_id').in('id', ids);
  if (error) handleDbError(error);
  return (data ?? []) as { id: string; categoria_id: string | null }[];
}

/** Alumnos ACTIVOS de una categoría: destinatarios por defecto de un anuncio. */
export async function findAlumnoIdsActivosByCategoria(categoriaId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('alumnos')
    .select('id')
    .eq('categoria_id', categoriaId)
    .eq('estado', 'activo');
  if (error) handleDbError(error);
  return (data ?? []).map((a: { id: string }) => a.id);
}

export async function findDestinatarios(anuncioId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from(TABLE_DEST).select('alumno_id').eq('anuncio_id', anuncioId);
  if (error) handleDbError(error);
  return (data ?? []).map((d: { alumno_id: string }) => d.alumno_id);
}

export async function esDestinatario(anuncioId: string, alumnoId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from(TABLE_DEST)
    .select('alumno_id')
    .eq('anuncio_id', anuncioId)
    .eq('alumno_id', alumnoId)
    .maybeSingle();
  if (error) handleDbError(error);
  return Boolean(data);
}

export async function reemplazarDestinatarios(anuncioId: string, alumnoIds: string[]) {
  const del = await supabaseAdmin.from(TABLE_DEST).delete().eq('anuncio_id', anuncioId);
  if (del.error) handleDbError(del.error);

  if (alumnoIds.length === 0) return;
  const filas = alumnoIds.map((alumno_id) => ({ anuncio_id: anuncioId, alumno_id }));
  const ins = await supabaseAdmin.from(TABLE_DEST).insert(filas);
  if (ins.error) handleDbError(ins.error);
}
