import { supabaseAdmin } from '../../config/supabase';
import type { EventoRow, HorarioRow } from '../dashboard/dashboard.utils';
import type { CambiosEvento, FiltroEventos, NuevoEvento } from './calendario.schema';

const CAMPOS = 'id,titulo,fecha,hora_inicio,hora_fin,ubicacion,categoria_id,descripcion,created_at';

export interface EventoCompletoRow extends EventoRow {
  descripcion: string | null;
  created_at: string;
}

function toRow(body: CambiosEvento) {
  const row: Record<string, unknown> = {};
  if (body.titulo !== undefined) row.titulo = body.titulo;
  if (body.fecha !== undefined) row.fecha = body.fecha;
  if (body.horaInicio !== undefined) row.hora_inicio = body.horaInicio;
  if (body.horaFin !== undefined) row.hora_fin = body.horaFin;
  if (body.ubicacion !== undefined) row.ubicacion = body.ubicacion;
  if (body.categoriaId !== undefined) row.categoria_id = body.categoriaId;
  if (body.descripcion !== undefined) row.descripcion = body.descripcion;
  return row;
}

export async function categorias(ids?: string[]) {
  if (ids && ids.length === 0) return [];
  let query = supabaseAdmin.from('categorias').select('id,nombre').order('nombre');
  if (ids) query = query.in('id', ids);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as { id: string; nombre: string }[];
}

export async function findAll(filtro: FiltroEventos) {
  let query = supabaseAdmin.from('eventos').select(CAMPOS);
  if (filtro.desde) query = query.gte('fecha', filtro.desde);
  if (filtro.hasta) query = query.lte('fecha', filtro.hasta);
  if (filtro.categoriaId) query = query.eq('categoria_id', filtro.categoriaId);
  const { data, error } = await query.order('fecha').order('hora_inicio').order('id').limit(1000);
  if (error) throw error;
  return (data ?? []) as EventoCompletoRow[];
}

export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from('eventos').select(CAMPOS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as EventoCompletoRow | null;
}

export async function create(body: NuevoEvento) {
  const { data, error } = await supabaseAdmin.from('eventos').insert(toRow(body)).select(CAMPOS).single();
  if (error) throw error;
  return data as EventoCompletoRow;
}

export async function update(id: string, body: CambiosEvento) {
  const { data, error } = await supabaseAdmin.from('eventos').update(toRow(body)).eq('id', id).select(CAMPOS).maybeSingle();
  if (error) throw error;
  return data as EventoCompletoRow | null;
}

export async function remove(id: string) {
  const { data, error } = await supabaseAdmin.from('eventos').delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function horariosActivos(categoriaIds: string[]) {
  if (categoriaIds.length === 0) return [];
  const { data, error } = await supabaseAdmin.from('horarios')
    .select('id,categoria_id,dia,hora_inicio,hora_fin,cancha,estado')
    .in('categoria_id', categoriaIds).eq('estado', 'activo');
  if (error) throw error;
  return (data ?? []) as HorarioRow[];
}

/** Próximos eventos desde "ahora" (hora de Lima). Sin categorías → todos (ADM). */
export async function eventosProximos(hoy: string, hora: string, limite: number, categoriaIds?: string[]) {
  let query = supabaseAdmin.from('eventos').select(CAMPOS)
    .or(`fecha.gt.${hoy},and(fecha.eq.${hoy},hora_inicio.gte.${hora})`);
  if (categoriaIds) {
    query = categoriaIds.length
      ? query.or(`categoria_id.is.null,categoria_id.in.(${categoriaIds.join(',')})`)
      : query.is('categoria_id', null);
  }
  const { data, error } = await query.order('fecha').order('hora_inicio').order('id').limit(limite);
  if (error) throw error;
  return (data ?? []) as EventoCompletoRow[];
}
