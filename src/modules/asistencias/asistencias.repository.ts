import { supabaseAdmin } from '../../config/supabase';

export interface AsistenciaRow {
  id: string;
  alumno_id: string;
  categoria_id: string | null;
  fecha: string;
  fecha_hora: string;
  metodo: 'ESCANEO' | 'MANUAL';
  created_at?: string;
}

export interface AlumnoAsistenciaRow {
  id: string;
  dni: string;
  codigo: string | null;
  nombres: string;
  apellidos: string;
  categoria_id: string | null;
  estado: string;
}

const CAMPOS = 'id,alumno_id,categoria_id,fecha,fecha_hora,metodo,created_at';
const CAMPOS_ALUMNO = 'id,dni,codigo,nombres,apellidos,categoria_id,estado';

export async function findAlumnoByDni(dni: string) {
  const { data, error } = await supabaseAdmin.from('alumnos').select(CAMPOS_ALUMNO).eq('dni', dni).maybeSingle();
  if (error) throw error;
  return data as AlumnoAsistenciaRow | null;
}

export async function findAlumnoById(id: string) {
  const { data, error } = await supabaseAdmin.from('alumnos').select(CAMPOS_ALUMNO).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as AlumnoAsistenciaRow | null;
}

/** Ids de alumnos cuyo nombre, apellido, DNI o código coincide con el texto. */
export async function findAlumnoIdsByTexto(texto: string) {
  const literal = texto.replace(/[\\%_]/g, '\\$&');
  const patron = '"%' + literal.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '%"';
  const { data, error } = await supabaseAdmin.from('alumnos').select('id')
    .or(['nombres', 'apellidos', 'dni', 'codigo'].map((campo) => `${campo}.ilike.${patron}`).join(','))
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map((fila) => fila.id as string);
}

export async function findDetalles(alumnoIds: string[], categoriaIds: string[]) {
  const buscar = async <T>(tabla: string, campos: string, ids: string[]) => {
    const filas: T[] = [];
    for (let inicio = 0; inicio < ids.length; inicio += 100) {
      const { data, error } = await supabaseAdmin.from(tabla).select(campos).in('id', ids.slice(inicio, inicio + 100));
      if (error) throw error;
      filas.push(...((data ?? []) as T[]));
    }
    return filas;
  };
  const [alumnos, categorias] = await Promise.all([
    buscar<AlumnoAsistenciaRow>('alumnos', CAMPOS_ALUMNO, [...new Set(alumnoIds)]),
    buscar<{ id: string; nombre: string }>('categorias', 'id,nombre', [...new Set(categoriaIds)]),
  ]);
  return {
    alumnos: new Map(alumnos.map((fila) => [fila.id, fila])),
    categorias: new Map(categorias.map((fila) => [fila.id, fila.nombre])),
  };
}

export async function existeEnFecha(alumnoId: string, fecha: string, excluirId?: string) {
  let query = supabaseAdmin.from('asistencias').select('id').eq('alumno_id', alumnoId).eq('fecha', fecha);
  if (excluirId) query = query.neq('id', excluirId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function findAll(filtro: {
  alumnoIds?: string[]; categoriaIds?: string[]; categoriaId?: string; fecha?: string;
  desde?: string; hasta?: string; metodo?: string; from: number; to: number;
}) {
  let query = supabaseAdmin.from('asistencias').select(CAMPOS, { count: 'exact' });
  if (filtro.alumnoIds) query = query.in('alumno_id', filtro.alumnoIds);
  if (filtro.categoriaIds) query = query.in('categoria_id', filtro.categoriaIds);
  if (filtro.categoriaId) query = query.eq('categoria_id', filtro.categoriaId);
  if (filtro.fecha) query = query.eq('fecha', filtro.fecha);
  if (filtro.desde) query = query.gte('fecha', filtro.desde);
  if (filtro.hasta) query = query.lte('fecha', filtro.hasta);
  if (filtro.metodo) query = query.eq('metodo', filtro.metodo);
  const { data, error, count } = await query.order('fecha_hora', { ascending: false }).order('id')
    .range(filtro.from, filtro.to);
  if (error) throw error;
  return { rows: (data ?? []) as AsistenciaRow[], total: count ?? 0 };
}

export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from('asistencias').select(CAMPOS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as AsistenciaRow | null;
}

export async function create(row: Omit<AsistenciaRow, 'id' | 'created_at'>) {
  const { data, error } = await supabaseAdmin.from('asistencias').insert(row).select(CAMPOS).single();
  if (error) throw error;
  return data as AsistenciaRow;
}

export async function update(id: string, cambios: Partial<Pick<AsistenciaRow, 'fecha' | 'fecha_hora' | 'metodo'>>) {
  const { data, error } = await supabaseAdmin.from('asistencias').update(cambios).eq('id', id).select(CAMPOS).maybeSingle();
  if (error) throw error;
  return data as AsistenciaRow | null;
}

export async function remove(id: string) {
  const { data, error } = await supabaseAdmin.from('asistencias').delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
