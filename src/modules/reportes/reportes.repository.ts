import { supabaseAdmin } from '../../config/supabase';
import type { FiltroAsistencia } from './reportes.schema';

export interface AsistenciaRow {
  id: string;
  alumno_id: string;
  categoria_id: string | null;
  fecha: string;
  fecha_hora: string;
  metodo: 'ESCANEO' | 'MANUAL';
}
export interface AlumnoRow { id: string; dni: string; nombres: string; apellidos: string }
export interface CategoriaRow { id: string; nombre: string }

const PAGE_SIZE = 500;

export async function obtenerRegistrosAsistencia(filtros: FiltroAsistencia) {
  const registros: AsistenciaRow[] = [];
  for (let desde = 0; ; desde += PAGE_SIZE) {
    let query = supabaseAdmin.from('asistencias')
      .select('id,alumno_id,categoria_id,fecha,fecha_hora,metodo')
      .gte('fecha', filtros.desde).lte('fecha', filtros.hasta);
    if (filtros.categoriaId) query = query.eq('categoria_id', filtros.categoriaId);
    if (filtros.metodo) query = query.eq('metodo', filtros.metodo);
    const { data, error } = await query.order('fecha_hora').order('id')
      .range(desde, desde + PAGE_SIZE - 1).returns<AsistenciaRow[]>();
    if (error) throw error;
    const pagina = data ?? [];
    registros.push(...pagina);
    if (pagina.length < PAGE_SIZE) return registros;
  }
}

async function buscarPorIds<T>(tabla: string, campos: string, ids: string[]): Promise<T[]> {
  const resultado: T[] = [];
  for (let inicio = 0; inicio < ids.length; inicio += 100) {
    const { data, error } = await supabaseAdmin.from(tabla).select(campos)
      .in('id', ids.slice(inicio, inicio + 100)).returns<T[]>();
    if (error) throw error;
    resultado.push(...data ?? []);
  }
  return resultado;
}

export async function obtenerDetalles(registros: AsistenciaRow[]) {
  const alumnoIds = [...new Set(registros.map((row) => row.alumno_id))];
  const categoriaIds = [...new Set(registros.map((row) => row.categoria_id).filter((id): id is string => !!id))];
  const [alumnos, categorias] = await Promise.all([
    buscarPorIds<AlumnoRow>('alumnos', 'id,dni,nombres,apellidos', alumnoIds),
    buscarPorIds<CategoriaRow>('categorias', 'id,nombre', categoriaIds),
  ]);
  return {
    alumnos: new Map(alumnos.map((row) => [row.id, row])),
    categorias: new Map(categorias.map((row) => [row.id, row])),
  };
}
