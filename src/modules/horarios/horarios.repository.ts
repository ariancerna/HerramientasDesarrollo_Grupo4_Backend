import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';
import type { HorarioChanges, HorarioRow } from './horarios.types';

const columnas = 'id,categoria_id,dia,hora_inicio,hora_fin,cancha,estado,created_at';

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

    async buscar(categoriaId: string, horarioId: string): Promise<HorarioRow | null> {
      const { data, error } = await client.from('horarios').select(columnas)
        .eq('id', horarioId).eq('categoria_id', categoriaId).maybeSingle();
      if (error) throw error;
      return data;
    },

    async actualizar(categoriaId: string, horarioId: string, changes: HorarioChanges): Promise<HorarioRow | null> {
      const { data, error } = await client.from('horarios').update(changes)
        .eq('id', horarioId).eq('categoria_id', categoriaId).select(columnas).maybeSingle();
      // La restricción SQL protege también frente a cambios concurrentes de horas.
      if (error?.code === '23514') {
        throw ApiError.badRequest('La hora final debe ser mayor a la hora inicial');
      }
      if (error) throw error;
      return data;
    },
  };
}

export const horariosRepository = crearHorariosRepository(supabaseAdmin);
