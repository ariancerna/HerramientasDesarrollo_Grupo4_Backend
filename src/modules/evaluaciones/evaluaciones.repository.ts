import { supabaseAdmin } from '../../config/supabase';
import type { CambiosEvaluacion } from './evaluaciones.schema';

const TABLE = 'evaluaciones';
const CAMPOS = 'id,alumno_id,profesor_id,fecha,rendimiento_tecnico,rendimiento_fisico,actitud,observaciones,created_at';

export interface EvaluacionRow {
  id: string;
  alumno_id: string;
  profesor_id: string;
  fecha: string;
  rendimiento_tecnico: number | null;
  rendimiento_fisico: number | null;
  actitud: number | null;
  observaciones: string;
  created_at: string;
}

function toRow(body: CambiosEvaluacion) {
  const row: Record<string, unknown> = {};
  if (body.alumnoId !== undefined) row.alumno_id = body.alumnoId;
  if (body.fecha !== undefined) row.fecha = body.fecha;
  if (body.rendimientoTecnico !== undefined) row.rendimiento_tecnico = body.rendimientoTecnico;
  if (body.rendimientoFisico !== undefined) row.rendimiento_fisico = body.rendimientoFisico;
  if (body.actitud !== undefined) row.actitud = body.actitud;
  if (body.observaciones !== undefined) row.observaciones = body.observaciones;
  return row;
}

export async function findAll(filtro: {
  profesorId?: string; alumnoId?: string; desde?: string; hasta?: string; from: number; to: number;
}) {
  let query = supabaseAdmin.from(TABLE).select(CAMPOS, { count: 'exact' });
  if (filtro.profesorId) query = query.eq('profesor_id', filtro.profesorId);
  if (filtro.alumnoId) query = query.eq('alumno_id', filtro.alumnoId);
  if (filtro.desde) query = query.gte('fecha', filtro.desde);
  if (filtro.hasta) query = query.lte('fecha', filtro.hasta);
  const { data, error, count } = await query.order('fecha', { ascending: false })
    .order('created_at', { ascending: false }).order('id').range(filtro.from, filtro.to);
  if (error) throw error;
  return { rows: (data ?? []) as EvaluacionRow[], total: count ?? 0 };
}

export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).select(CAMPOS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as EvaluacionRow | null;
}

export async function create(profesorId: string, body: CambiosEvaluacion) {
  const { data, error } = await supabaseAdmin.from(TABLE).insert({ ...toRow(body), profesor_id: profesorId })
    .select(CAMPOS).single();
  if (error) throw error;
  return data as EvaluacionRow;
}

export async function update(id: string, body: CambiosEvaluacion) {
  const { data, error } = await supabaseAdmin.from(TABLE).update(toRow(body)).eq('id', id).select(CAMPOS).maybeSingle();
  if (error) throw error;
  return data as EvaluacionRow | null;
}

export async function remove(id: string) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function findAlumno(id: string) {
  const { data, error } = await supabaseAdmin.from('alumnos').select('id,categoria_id').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as { id: string; categoria_id: string | null } | null;
}

export async function nombres(alumnoIds: string[], profesorIds: string[]) {
  const buscar = async (tabla: string, campos: string, ids: string[]) => {
    if (ids.length === 0) return [];
    const { data, error } = await supabaseAdmin.from(tabla).select(campos).in('id', [...new Set(ids)]);
    if (error) throw error;
    return (data ?? []) as unknown as Record<string, string>[];
  };
  const [alumnos, profesores] = await Promise.all([
    buscar('alumnos', 'id,nombres,apellidos', alumnoIds),
    buscar('profesores', 'id,nombre', profesorIds),
  ]);
  return {
    alumnos: new Map(alumnos.map((fila) => [fila.id, `${fila.nombres} ${fila.apellidos}`])),
    profesores: new Map(profesores.map((fila) => [fila.id, fila.nombre])),
  };
}
