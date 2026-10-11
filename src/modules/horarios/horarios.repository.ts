import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';

function comprobarError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === '23503') throw ApiError.conflict('El horario tiene registros asociados y no puede eliminarse');
  throw error;
}

export function crearHorariosRepository(client: SupabaseClient) {
  return {
    async categoriaExiste(categoriaId: string): Promise<boolean> {
      const { data, error } = await client.from('categorias').select('id').eq('id', categoriaId).maybeSingle();
      if (error) throw error;
      return data !== null;
    },

    async eliminar(categoriaId: string, horarioId: string): Promise<boolean> {
      // Ambos filtros se aplican en la escritura, no solo en una consulta previa.
      const { data, error } = await client.from('horarios').delete()
        .eq('id', horarioId).eq('categoria_id', categoriaId).select('id').maybeSingle();
      comprobarError(error);
      return data !== null;
    },
  };
}

export const horariosRepository = crearHorariosRepository(supabaseAdmin);
