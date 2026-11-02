import { supabaseAdmin } from '../../config/supabase';

/** Las tablas usan snake_case; el API responde en camelCase como el resto de módulos. */
function presentarMiConfig(row: any) {
  return { tema: row.tema, notificacionesSilenciadas: row.notificaciones_silenciadas };
}

function presentarConfigClub(row: any) {
  return { montoMensualidad: Number(row.monto_mensualidad), diaVencimiento: row.dia_vencimiento };
}

export async function obtenerMiConfig(usuarioId: string) {
  const { data } = await supabaseAdmin.from('configuraciones_usuario').select('*').eq('usuario_id', usuarioId).maybeSingle();
  return data ? presentarMiConfig(data) : { tema: 'sistema', notificacionesSilenciadas: false };
}

export async function actualizarMiConfig(usuarioId: string, cambios: { tema?: string; notificacionesSilenciadas?: boolean }) {
  const fila: Record<string, unknown> = { usuario_id: usuarioId };
  if (cambios.tema !== undefined) fila.tema = cambios.tema;
  if (cambios.notificacionesSilenciadas !== undefined) fila.notificaciones_silenciadas = cambios.notificacionesSilenciadas;
  const { data, error } = await supabaseAdmin.from('configuraciones_usuario').upsert(fila).select().single();
  if (error) throw error;
  return presentarMiConfig(data);
}

export async function obtenerConfigClub() {
  const { data } = await supabaseAdmin.from('configuracion_club').select('*').single();
  return data ? presentarConfigClub(data) : { montoMensualidad: 180, diaVencimiento: 10 };
}

export async function actualizarConfigClub(cambios: { montoMensualidad?: number; diaVencimiento?: number }) {
  const fila: Record<string, unknown> = {};
  if (cambios.montoMensualidad !== undefined) fila.monto_mensualidad = cambios.montoMensualidad;
  if (cambios.diaVencimiento !== undefined) fila.dia_vencimiento = cambios.diaVencimiento;
  const { data, error } = await supabaseAdmin.from('configuracion_club').update(fila).eq('id', 1).select().single();
  if (error) throw error;
  return presentarConfigClub(data);
}
