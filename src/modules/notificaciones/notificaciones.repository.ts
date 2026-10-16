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
