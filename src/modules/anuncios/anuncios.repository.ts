import { supabaseAdmin } from '../../config/supabase';
import { CambiosAnuncio } from './anuncios.schema';

const TABLE = 'anuncios';
const SELECT = '*, anuncios_destinatarios(alumno_id)';

export interface FiltrosAnuncios {
  profesorId?: string;
  /** Solo anuncios enviados a este alumno. */
  alumnoId?: string;
}

/** Convierte la fila de Supabase al formato que usa el frontend. */
function presentar(row: any) {
  return {
    id: row.id,
    profesorId: row.profesor_id,
    titulo: row.titulo,
    mensaje: row.mensaje,
    fechaCreacion: row.created_at,
    destinatarios: (row.anuncios_destinatarios ?? []).map((item: any) => item.alumno_id),
    categoriaId: row.categoria_id ?? undefined,
    estado: row.estado,
  };
}

function aFila(payload: CambiosAnuncio) {
  const fila: Record<string, unknown> = {};
  if (payload.titulo !== undefined) fila.titulo = payload.titulo;
  if (payload.mensaje !== undefined) fila.mensaje = payload.mensaje;
  if (payload.categoriaId !== undefined) fila.categoria_id = payload.categoriaId;
  if (payload.estado !== undefined) fila.estado = payload.estado;
  return fila;
}

async function guardarDestinatarios(anuncioId: string, alumnoIds: string[]) {
  const { error: borrarError } = await supabaseAdmin.from('anuncios_destinatarios').delete().eq('anuncio_id', anuncioId);
  if (borrarError) throw borrarError;
  if (alumnoIds.length === 0) return;
  const filas = [...new Set(alumnoIds)].map((alumnoId) => ({ anuncio_id: anuncioId, alumno_id: alumnoId }));
  const { error } = await supabaseAdmin.from('anuncios_destinatarios').insert(filas);
  if (error) throw error;
}

export async function findAll(filters: FiltrosAnuncios = {}) {
  let query = supabaseAdmin.from(TABLE).select(SELECT).order('created_at', { ascending: false });
  if (filters.profesorId) query = query.eq('profesor_id', filters.profesorId);
  if (filters.alumnoId) {
    const { data: enviados, error } = await supabaseAdmin
      .from('anuncios_destinatarios')
      .select('anuncio_id')
      .eq('alumno_id', filters.alumnoId);
    if (error) throw error;
    const ids = (enviados ?? []).map((item) => item.anuncio_id);
    if (ids.length === 0) return [];
    query = query.in('id', ids).eq('estado', 'enviado');
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(presentar);
}

export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? presentar(data) : null;
}

export async function create(profesorId: string, payload: CambiosAnuncio) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({ ...aFila(payload), profesor_id: profesorId })
    .select('id')
    .single();
  if (error) throw error;
  try {
    await guardarDestinatarios(data.id, payload.destinatarios ?? []);
  } catch (err) {
    // Sin destinatarios el anuncio quedaría huérfano: se revierte la creación.
    await supabaseAdmin.from(TABLE).delete().eq('id', data.id);
    throw err;
  }
  return findById(data.id);
}

export async function update(id: string, payload: CambiosAnuncio) {
  const fila = aFila(payload);
  if (Object.keys(fila).length > 0) {
    const { error } = await supabaseAdmin.from(TABLE).update(fila).eq('id', id);
    if (error) throw error;
  }
  if (payload.destinatarios) await guardarDestinatarios(id, payload.destinatarios);
  return findById(id);
}

export async function remove(id: string) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
