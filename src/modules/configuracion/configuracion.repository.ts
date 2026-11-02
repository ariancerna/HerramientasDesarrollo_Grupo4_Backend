import { supabaseAdmin } from '../../config/supabase';
import type { ConfiguracionUsuarioRow, MiConfiguracion } from './configuracion.types';
import type { CambiosMiConfiguracion } from './configuracion.schema';
import { ApiError } from '../../lib/errors/api-error';

export function presentarMiConfig(row: ConfiguracionUsuarioRow): MiConfiguracion {
  return { tema: row.tema, notificacionesSilenciadas: row.notificaciones_silenciadas };
}

export async function obtenerMiConfig(usuarioId: string): Promise<MiConfiguracion> {
  const { data, error } = await supabaseAdmin.from('configuraciones_usuario')
    .select('tema,notificaciones_silenciadas').eq('usuario_id', usuarioId).maybeSingle();
  if (error) throw error;
  return data ? presentarMiConfig(data) : { tema: 'sistema', notificacionesSilenciadas: false };
}

export async function actualizarMiConfig(usuarioId: string, cambios: CambiosMiConfiguracion): Promise<MiConfiguracion> {
  // ON CONFLICT aplica exclusivamente los campos enviados, sin lecturas previas.
  const { data, error } = await supabaseAdmin.rpc('actualizar_configuracion_usuario', {
    p_usuario_id: usuarioId,
    p_tema: cambios.tema ?? null,
    p_silenciadas: cambios.notificacionesSilenciadas ?? null,
  }).single<ConfiguracionUsuarioRow>();
  if (error) throw error;
  if (!data) throw ApiError.internal('No se pudo confirmar la configuración guardada');
  return presentarMiConfig(data);
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
