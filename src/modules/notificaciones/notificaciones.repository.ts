import { supabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';
import type { CrearNotificacion, FiltroNotificaciones } from './notificaciones.schema';

const FIELDS = 'id,usuario_id,titulo,descripcion,tipo,href,leida,creada_en';

function presentar(row: { id: string; titulo: string; descripcion: string | null;
  tipo: string | null; href: string | null; leida: boolean; creada_en: string }) {
  return { id: row.id, titulo: row.titulo, descripcion: row.descripcion,
    tipo: row.tipo, href: row.href, leida: row.leida, creadaEn: row.creada_en };
}

export async function list(usuarioId: string, filtro: FiltroNotificaciones) {
  const desde = (filtro.page - 1) * filtro.limit;
  let query = supabaseAdmin.from('notificaciones').select(FIELDS, { count: 'exact' })
    .eq('usuario_id', usuarioId);
  if (filtro.leida !== undefined) query = query.eq('leida', filtro.leida === 'true');
  const [{ data, count, error }, { count: noLeidas, error: countError }] = await Promise.all([
    query.order('creada_en', { ascending: false }).order('id', { ascending: false })
      .range(desde, desde + filtro.limit - 1),
    supabaseAdmin.from('notificaciones').select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId).eq('leida', false),
  ]);
  if (error) throw error;
  if (countError) throw countError;
  return { data: (data ?? []).map(presentar), meta: { page: filtro.page, limit: filtro.limit,
    total: count ?? 0, noLeidas: noLeidas ?? 0 } };
}

export async function getById(usuarioId: string, id: string) {
  const { data, error } = await supabaseAdmin.from('notificaciones').select(FIELDS)
    .eq('usuario_id', usuarioId).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound('Notificación no encontrada');
  return presentar(data);
}

export async function markRead(usuarioId: string, id: string) {
  const { data, error } = await supabaseAdmin.from('notificaciones').update({ leida: true })
    .eq('usuario_id', usuarioId).eq('id', id).select(FIELDS).maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound('Notificación no encontrada');
  return presentar(data);
}

export async function remove(usuarioId: string, id: string) {
  const { data, error } = await supabaseAdmin.from('notificaciones').delete()
    .eq('usuario_id', usuarioId).eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound('Notificación no encontrada');
}

export async function create(input: CrearNotificacion) {
  const { data: usuario, error: userError } = await supabaseAdmin.from('usuarios').select('id')
    .eq('id', input.usuarioId).maybeSingle();
  if (userError) throw userError;
  if (!usuario) throw ApiError.notFound('Usuario destinatario no encontrado');
  const { data, error } = await supabaseAdmin.from('notificaciones').insert({
    usuario_id: input.usuarioId, titulo: input.titulo, descripcion: input.descripcion ?? null,
    tipo: input.tipo ?? null, href: input.href ?? null,
  }).select(FIELDS).single();
  if (error) throw error;
  return presentar(data);
}

export async function markAllRead(usuarioId: string) {
  const { data, error } = await supabaseAdmin.from('notificaciones').update({ leida: true })
    .eq('usuario_id', usuarioId).eq('leida', false).select('id');
  if (error) throw error;
  return { actualizadas: (data ?? []).length };
}

export interface NotificacionServidor {
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  href?: string | null;
}

/**
 * Regla de negocio #8: el servidor genera las notificaciones (anuncio enviado,
 * asistencia registrada, pago registrado...). Es "best effort": si falla, la
 * operación principal ya se guardó y no debe revertirse por un aviso.
 */
export async function notificarUsuarios(usuarioIds: string[], aviso: NotificacionServidor) {
  const destinatarios = [...new Set(usuarioIds)];
  if (destinatarios.length === 0) return 0;
  try {
    const filas = destinatarios.map((usuarioId) => ({
      usuario_id: usuarioId, titulo: aviso.titulo, descripcion: aviso.descripcion ?? null,
      tipo: aviso.tipo, href: aviso.href ?? null,
    }));
    for (let inicio = 0; inicio < filas.length; inicio += 500) {
      const { error } = await supabaseAdmin.from('notificaciones').insert(filas.slice(inicio, inicio + 500));
      if (error) throw error;
    }
    return destinatarios.length;
  } catch (error) {
    console.error('No se pudieron generar notificaciones', aviso.tipo, error);
    return 0;
  }
}

/** Notifica a las cuentas de acceso vinculadas a esos alumnos (los que no tienen cuenta se omiten). */
export async function notificarAlumnos(alumnoIds: string[], aviso: NotificacionServidor) {
  const ids = [...new Set(alumnoIds)];
  if (ids.length === 0) return 0;
  try {
    const usuarioIds: string[] = [];
    for (let inicio = 0; inicio < ids.length; inicio += 100) {
      const { data, error } = await supabaseAdmin.from('usuarios').select('id')
        .eq('rol', 'ALU').eq('activo', true).in('estudiante_id', ids.slice(inicio, inicio + 100));
      if (error) throw error;
      usuarioIds.push(...(data ?? []).map((fila) => fila.id as string));
    }
    return await notificarUsuarios(usuarioIds, aviso);
  } catch (error) {
    console.error('No se pudieron generar notificaciones', aviso.tipo, error);
    return 0;
  }
}
