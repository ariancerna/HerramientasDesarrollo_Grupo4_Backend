import { supabaseAdmin } from '../../config/supabase';
import { CambiosHorario } from './horarios.schema';
import { presentHorario, presentHorarios } from '../../lib/utils/horarios';
export { presentHorario } from '../../lib/utils/horarios';
const TABLE = 'horarios';
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
  return presentHorarios(data ?? []);
}
/** Horarios de varias categorías con el nombre de cada una (HOR-05). */
export async function findByCategorias(categoriaIds: string[]) {
  if (categoriaIds.length === 0) return [];
  const { data, error } = await supabaseAdmin.from(TABLE).select('*, categorias(nombre)').in('categoria_id', categoriaIds);
  if (error) throw error;
  const nombres = new Map((data ?? []).map((row: any) => [row.id, row.categorias?.nombre ?? null]));
  return presentHorarios(data ?? []).map((horario) => ({ ...horario, categoria: nombres.get(horario.id) ?? null }));
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
