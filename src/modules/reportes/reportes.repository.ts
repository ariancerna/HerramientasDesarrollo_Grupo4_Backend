import { supabaseAdmin } from '../../config/supabase';

export async function obtenerRegistrosAsistencia(filtros: {
  categoriaId?: string;
  desde: string;
  hasta: string;
  metodo?: string;
}) {
  let query = supabaseAdmin
    .from('asistencias')
    .select('*')
    .gte('fecha', filtros.desde)
    .lte('fecha', filtros.hasta);
  if (filtros.categoriaId) query = query.eq('categoria_id', filtros.categoriaId);
  if (filtros.metodo) query = query.eq('metodo', filtros.metodo);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
