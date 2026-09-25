import { supabaseAdmin } from '../../config/supabase';

const TABLE = 'profesores';

export async function findAll(filters: Record<string, unknown> = {}) {
  // TODO: aplicar los filtros propios de PROFESORES (ver docs/ENDPOINTS.md).
  const { data, error } = await supabaseAdmin.from(TABLE).select('*');
  if (error) throw error;
  return data;
}

export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function create(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function update(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from(TABLE).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function remove(id: string) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
