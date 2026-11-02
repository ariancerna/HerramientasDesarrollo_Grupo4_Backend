import { supabaseAdmin } from '../../config/supabase';
import { CambiosEvaluacion } from './evaluaciones.schema';

const TABLE = 'evaluaciones';

export interface FiltrosEvaluaciones {
  profesorId?: string;
  alumnoId?: string;
}

/** Convierte la fila de Supabase al formato que usa el frontend. */
function presentar(row: any) {
  return {
    id: row.id,
    alumnoId: row.alumno_id,
    profesorId: row.profesor_id,
    fecha: row.fecha,
    rendimientoTecnico: row.rendimiento_tecnico ?? undefined,
    rendimientoFisico: row.rendimiento_fisico ?? undefined,
    actitud: row.actitud ?? undefined,
    observaciones: row.observaciones,
  };
}

function aFila(payload: CambiosEvaluacion) {
  const fila: Record<string, unknown> = {};
  if (payload.alumnoId !== undefined) fila.alumno_id = payload.alumnoId;
  if (payload.fecha !== undefined) fila.fecha = payload.fecha;
  if (payload.rendimientoTecnico !== undefined) fila.rendimiento_tecnico = payload.rendimientoTecnico;
  if (payload.rendimientoFisico !== undefined) fila.rendimiento_fisico = payload.rendimientoFisico;
  if (payload.actitud !== undefined) fila.actitud = payload.actitud;
  if (payload.observaciones !== undefined) fila.observaciones = payload.observaciones;
  return fila;
}

export async function findAll(filters: FiltrosEvaluaciones = {}) {
  let query = supabaseAdmin.from(TABLE).select('*').order('fecha', { ascending: false });
  if (filters.profesorId) query = query.eq('profesor_id', filters.profesorId);
  if (filters.alumnoId) query = query.eq('alumno_id', filters.alumnoId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(presentar);
}

export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? presentar(data) : null;
}

export async function create(profesorId: string, payload: CambiosEvaluacion) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({ ...aFila(payload), profesor_id: profesorId })
    .select()
    .single();
  if (error) throw error;
  return presentar(data);
}

export async function update(id: string, payload: CambiosEvaluacion) {
  const { data, error } = await supabaseAdmin.from(TABLE).update(aFila(payload)).eq('id', id).select().single();
  if (error) throw error;
  return presentar(data);
}

export async function remove(id: string) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
