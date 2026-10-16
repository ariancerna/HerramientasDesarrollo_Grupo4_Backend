import { supabaseAdmin } from '../../config/supabase';

const TABLE = 'anuncios';
const CAMPOS = 'id,profesor_id,titulo,mensaje,categoria_id,estado,created_at';

export interface AnuncioRow {
  id: string;
  profesor_id: string;
  titulo: string;
  mensaje: string;
  categoria_id: string | null;
  estado: 'borrador' | 'enviado';
  created_at: string;
}

export async function findByProfesor(profesorId: string, estado: string | undefined, from: number, to: number) {
  let query = supabaseAdmin.from(TABLE).select(CAMPOS, { count: 'exact' }).eq('profesor_id', profesorId);
  if (estado) query = query.eq('estado', estado);
  const { data, error, count } = await query.order('created_at', { ascending: false }).order('id').range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as AnuncioRow[], total: count ?? 0 };
}

export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).select(CAMPOS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as AnuncioRow | null;
}

export async function create(row: Omit<AnuncioRow, 'id' | 'created_at'>) {
  const { data, error } = await supabaseAdmin.from(TABLE).insert(row).select(CAMPOS).single();
  if (error) throw error;
  return data as AnuncioRow;
}

export async function update(id: string, cambios: Partial<Omit<AnuncioRow, 'id' | 'created_at' | 'profesor_id'>>) {
  const { data, error } = await supabaseAdmin.from(TABLE).update(cambios).eq('id', id).select(CAMPOS).maybeSingle();
  if (error) throw error;
  return data as AnuncioRow | null;
}

/** Cambia a "enviado" solo si seguía en borrador (evita enviar dos veces en paralelo). */
export async function marcarEnviado(id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).update({ estado: 'enviado' })
    .eq('id', id).eq('estado', 'borrador').select(CAMPOS).maybeSingle();
  if (error) throw error;
  return data as AnuncioRow | null;
}

export async function remove(id: string) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function destinatarios(anuncioIds: string[]) {
  const mapa = new Map<string, string[]>(anuncioIds.map((id) => [id, []]));
  if (anuncioIds.length === 0) return mapa;
  const { data, error } = await supabaseAdmin.from('anuncios_destinatarios').select('anuncio_id,alumno_id')
    .in('anuncio_id', anuncioIds);
  if (error) throw error;
  for (const fila of data ?? []) mapa.get(fila.anuncio_id as string)?.push(fila.alumno_id as string);
  return mapa;
}

export async function reemplazarDestinatarios(anuncioId: string, alumnoIds: string[]) {
  const { error } = await supabaseAdmin.from('anuncios_destinatarios').delete().eq('anuncio_id', anuncioId);
  if (error) throw error;
  const { error: insertError } = await supabaseAdmin.from('anuncios_destinatarios')
    .insert(alumnoIds.map((alumnoId) => ({ anuncio_id: anuncioId, alumno_id: alumnoId })));
  if (insertError) throw insertError;
}

export async function alumnos(ids: string[]) {
  const { data, error } = await supabaseAdmin.from('alumnos').select('id,categoria_id').in('id', ids);
  if (error) throw error;
  return (data ?? []) as { id: string; categoria_id: string | null }[];
}

/** ANU-06: anuncios enviados a un alumno, más recientes primero. */
export async function enviadosA(alumnoId: string, limite: number) {
  const { data: filas, error } = await supabaseAdmin.from('anuncios_destinatarios').select('anuncio_id')
    .eq('alumno_id', alumnoId);
  if (error) throw error;
  const ids = (filas ?? []).map((fila) => fila.anuncio_id as string);
  const resultado: AnuncioRow[] = [];
  for (let inicio = 0; inicio < ids.length; inicio += 100) {
    const { data, error: anunciosError } = await supabaseAdmin.from(TABLE).select(CAMPOS)
      .in('id', ids.slice(inicio, inicio + 100)).eq('estado', 'enviado')
      .order('created_at', { ascending: false }).limit(limite);
    if (anunciosError) throw anunciosError;
    resultado.push(...((data ?? []) as AnuncioRow[]));
  }
  return resultado.sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)).slice(0, limite);
}

export async function nombres(profesorIds: string[], categoriaIds: string[]) {
  const buscar = async (tabla: string, ids: string[]) => {
    if (ids.length === 0) return new Map<string, string>();
    const { data, error } = await supabaseAdmin.from(tabla).select('id,nombre').in('id', [...new Set(ids)]);
    if (error) throw error;
    return new Map((data ?? []).map((fila) => [fila.id as string, fila.nombre as string]));
  };
  const [profesores, categorias] = await Promise.all([buscar('profesores', profesorIds), buscar('categorias', categoriaIds)]);
  return { profesores, categorias };
}
