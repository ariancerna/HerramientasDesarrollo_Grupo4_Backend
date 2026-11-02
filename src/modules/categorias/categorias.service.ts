import { supabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';
import type { NuevoHorario } from '../horarios/horarios.schema';
import * as repository from './categorias.repository';

function filasHorario(categoriaId: string, horarios: NuevoHorario[]) {
  return horarios.map((h) => ({
    categoria_id: categoriaId, dia: h.dia.charAt(0).toUpperCase() + h.dia.slice(1),
    hora_inicio: h.horaInicio, hora_fin: h.horaFin, cancha: h.cancha ?? null, estado: h.estado,
  }));
}

/** Reemplaza el conjunto de horarios de la categoría (CAT-03/04). */
async function reemplazarHorarios(categoriaId: string, horarios: NuevoHorario[]) {
  const { data: anteriores, error: readError } = await supabaseAdmin.from('horarios').select('*').eq('categoria_id', categoriaId);
  if (readError) throw readError;
  const { error: deleteError } = await supabaseAdmin.from('horarios').delete().eq('categoria_id', categoriaId);
  if (deleteError) throw deleteError;
  if (horarios.length === 0) return;
  const { error } = await supabaseAdmin.from('horarios').insert(filasHorario(categoriaId, horarios));
  if (error) {
    // Compensación: sin transacción entre llamadas, restauramos los horarios previos.
    if (anteriores?.length) await supabaseAdmin.from('horarios').insert(anteriores);
    throw error;
  }
}

export async function list(filters: Record<string, unknown>) { return repository.findAll(filters); }
export async function getById(id: string) {
  const categoria = await repository.findById(id);
  if (!categoria) throw ApiError.notFound('Categoría no encontrada');
  return categoria;
}
export async function create(payload: Record<string, unknown>) {
  const { horarios, ...datos } = payload as Record<string, unknown> & { horarios?: NuevoHorario[] };
  const categoria = await repository.create(datos);
  if (!horarios?.length) return categoria;
  try {
    await reemplazarHorarios(categoria.id, horarios);
  } catch (error) {
    await repository.remove(categoria.id);
    throw error;
  }
  return getById(categoria.id);
}
export async function update(id: string, payload: Record<string, unknown>) {
  const { horarios, ...datos } = payload as Record<string, unknown> & { horarios?: NuevoHorario[] };
  const categoria = Object.keys(datos).length ? await repository.update(id, datos) : await repository.findById(id);
  if (!categoria) throw ApiError.notFound('Categoría no encontrada');
  if (!horarios) return categoria;
  await reemplazarHorarios(id, horarios);
  return getById(id);
}
export async function remove(id: string) {
  try {
    const categoria = await repository.remove(id);
    if (!categoria) throw ApiError.notFound('Categoría no encontrada');
  } catch (error: any) {
    if (error?.code === '23503') throw ApiError.conflict('La categoría tiene alumnos u otros registros asociados');
    throw error;
  }
}
