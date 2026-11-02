import { supabaseAdmin } from '../../config/supabase';

const TABLE = 'sedes';
const FIELDS = 'id,nombre,direccion,created_at';

export async function findAll(_filters: Record<string, unknown> = {}) {
  const { data, error } = await supabaseAdmin.from(TABLE).select(FIELDS).order('nombre').order('id');
  if (error) throw error;
  return data;
}

export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE)
    .select(FIELDS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function create(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from(TABLE).insert(payload).select(FIELDS).single();
  if (error) throw error;
  return data;
}

export async function update(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from(TABLE).update(payload).eq('id', id).select(FIELDS).maybeSingle();
  if (error) throw error;
  return data;
}

export async function remove(id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
