import { supabaseAdmin } from '../../config/supabase';

const TABLE = 'alumnos';

export async function findCategoriaIdsByProfesor(profesorId?: string) {
  if (!profesorId) return [];

  const { data, error } = await supabaseAdmin
    .from('profesores_categorias')
    .select('categoria_id')
    .eq('profesor_id', profesorId);

  if (error) throw error;
  return (data ?? []).map((row) => row.categoria_id as string);
}

export async function findAll(filters: Record<string, unknown> = {}) {
  let query = supabaseAdmin
    .from(TABLE)
    .select('*', { count: 'exact' });

  if (typeof filters.texto === 'string' && filters.texto.trim()) {
    const texto = filters.texto.trim();
    query = query.or(`nombres.ilike.%${texto}%,apellidos.ilike.%${texto}%,dni.ilike.%${texto}%,codigo.ilike.%${texto}%`);
  }

  if (typeof filters.categoriaId === 'string' && filters.categoriaId) {
    query = query.eq('categoria_id', filters.categoriaId);
  }

  if (filters.estado === 'activo' || filters.estado === 'inactivo') {
    query = query.eq('estado', filters.estado);
  }

  if (Array.isArray(filters.categoriaIds) && filters.categoriaIds.length > 0) {
    query = query.in('categoria_id', filters.categoriaIds);
  }

  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 20);
  const from = Number(filters.from ?? (page - 1) * limit);
  const to = Number(filters.to ?? from + limit - 1);

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: data ?? [],
    page,
    limit,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / Math.max(1, limit))) || 0,
  };
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
