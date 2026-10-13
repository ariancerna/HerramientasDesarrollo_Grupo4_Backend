import { supabaseAdmin } from '../../config/supabase';
import type { ConfiguracionUsuarioRow, MiConfiguracion } from './configuracion.types';

export function presentarMiConfig(row: ConfiguracionUsuarioRow): MiConfiguracion {
  return { tema: row.tema, notificacionesSilenciadas: row.notificaciones_silenciadas };
}

export async function obtenerMiConfig(usuarioId: string): Promise<MiConfiguracion> {
  const { data, error } = await supabaseAdmin.from('configuraciones_usuario')
    .select('tema,notificaciones_silenciadas').eq('usuario_id', usuarioId).maybeSingle();
  if (error) throw error;
  return data ? presentarMiConfig(data) : { tema: 'sistema', notificacionesSilenciadas: false };
}

export async function actualizarMiConfig(usuarioId: string, cambios: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('configuraciones_usuario')
    .upsert({ usuario_id: usuarioId, ...cambios })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function obtenerConfigClub() {
  const { data } = await supabaseAdmin.from('configuracion_club').select('*').single();
  return data ?? { montoMensualidad: 180, diaVencimiento: 10 };
}

export async function actualizarConfigClub(cambios: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from('configuracion_club').update(cambios).eq('id', 1).select().single();
  if (error) throw error;
  return data;
}
