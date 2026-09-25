import { supabaseAdmin } from '../../config/supabase';

export async function obtenerMiConfig(usuarioId: string) {
  const { data } = await supabaseAdmin.from('configuraciones_usuario').select('*').eq('usuario_id', usuarioId).maybeSingle();
  return data ?? { tema: 'sistema', notificacionesSilenciadas: false };
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
