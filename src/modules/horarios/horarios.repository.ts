import { supabaseAdmin } from '../../config/supabase';
import { CambiosHorario } from './horarios.schema';
const TABLE = 'horarios';
export function presentHorario(row: any) {
  return { id: row.id, dia: row.dia.toLowerCase(), horaInicio: row.hora_inicio.slice(0, 5), horaFin: row.hora_fin.slice(0, 5), cancha: row.cancha, estado: row.estado };
}
function toRow(body: CambiosHorario) {
  const row: Record<string, unknown> = {};
  if (body.dia !== undefined) row.dia = body.dia.charAt(0).toUpperCase() + body.dia.slice(1);
  if (body.horaInicio !== undefined) row.hora_inicio = body.horaInicio;
  if (body.horaFin !== undefined) row.hora_fin = body.horaFin;
  if (body.cancha !== undefined) row.cancha = body.cancha;
  if (body.estado !== undefined) row.estado = body.estado;
  return row;
}
export async function findAll(categoriaId: string, filters: Record<string, unknown> = {}) {
  let query = supabaseAdmin.from(TABLE).select('*').eq('categoria_id', categoriaId).order('hora_inicio').order('id');
  if (filters.estado) query = query.eq('estado', filters.estado);
  const { data, error } = await query;
  if (error) throw error;
  const dias = ['lunes', 'martes', 'mi\u00e9rcoles', 'jueves', 'viernes', 's\u00e1bado', 'domingo'];
  return (data ?? []).map(presentHorario).sort((a, b) => dias.indexOf(a.dia) - dias.indexOf(b.dia));
}
export async function findById(categoriaId: string, id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).select('*').eq('categoria_id', categoriaId).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? presentHorario(data) : null;
}
export async function create(categoriaId: string, body: CambiosHorario) {
  const { data, error } = await supabaseAdmin.from(TABLE).insert({ ...toRow(body), categoria_id: categoriaId }).select().single();
  if (error) throw error;
  return presentHorario(data);
}
export async function update(categoriaId: string, id: string, body: CambiosHorario) {
  const { data, error } = await supabaseAdmin.from(TABLE).update(toRow(body)).eq('categoria_id', categoriaId).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data ? presentHorario(data) : null;
}
export async function remove(categoriaId: string, id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).delete().eq('categoria_id', categoriaId).eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  return data;
}
