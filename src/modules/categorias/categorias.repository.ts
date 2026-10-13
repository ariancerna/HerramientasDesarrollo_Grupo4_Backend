import { supabaseAdmin } from '../../config/supabase';
import { presentHorarios } from '../../lib/utils/horarios';

const SELECT = '*, horarios(*), profesores_categorias(profesor_id)';
export function presentCategoria(row: any) {
  return {
    id: row.id, nombre: row.nombre, descripcion: row.descripcion,
    profesorIds: (row.profesores_categorias ?? []).map((item: any) => item.profesor_id),
    horarios: presentHorarios(row.horarios ?? []),
  };
}
export async function findAll(filters: Record<string, unknown> = {}) {
  let query = supabaseAdmin.from('categorias').select(SELECT).order('nombre').order('id');
  if (typeof filters.texto === 'string' && filters.texto) {
    query = query.ilike('nombre', `%${filters.texto.replace(/[\\%_]/g, '\\$&')}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(presentCategoria);
}
export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from('categorias').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? presentCategoria(data) : null;
}
export async function create(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from('categorias').insert(payload).select(SELECT).single();
  if (error) throw error;
  return presentCategoria(data);
}
export async function update(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from('categorias').update(payload).eq('id', id).select(SELECT).maybeSingle();
  if (error) throw error;
  return data ? presentCategoria(data) : null;
}
export async function remove(id: string) {
  const { data, error } = await supabaseAdmin.from('categorias').delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  return data;
}
