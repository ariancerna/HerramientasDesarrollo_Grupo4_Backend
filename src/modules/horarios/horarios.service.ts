import { ApiError } from '../../lib/errors/api-error';
import { getById as categoriaById } from '../categorias/categorias.service';
import * as repository from './horarios.repository';
import { CambiosHorario, NuevoHorario } from './horarios.schema';
function segundos(hora: string) {
  const [horas, minutos, segundos = 0] = hora.split(':').map(Number);
  return horas * 3600 + minutos * 60 + segundos;
}
export async function list(categoriaId: string, filters: Record<string, unknown>) {
  await categoriaById(categoriaId);
  return repository.findAll(categoriaId, filters);
}
export async function getById(categoriaId: string, id: string) {
  await categoriaById(categoriaId);
  const horario = await repository.findById(categoriaId, id);
  if (!horario) throw ApiError.notFound('Horario no encontrado en esta categoria');
  return horario;
}
async function checkDia(categoriaId: string, dia: string, excluirId?: string) {
  const horarios = await repository.findAll(categoriaId);
  if (horarios.some((row) => row.dia === dia && row.id !== excluirId)) {
    throw ApiError.conflict('Ya existe un horario para ese dia en la categoria');
  }
}
export async function create(categoriaId: string, body: NuevoHorario) {
  await categoriaById(categoriaId);
  await checkDia(categoriaId, body.dia);
  try { return await repository.create(categoriaId, body); }
  catch (error: any) {
    if (error?.code === '23505') throw ApiError.conflict('Ya existe un horario para ese dia en la categoria');
    throw error;
  }
}
export async function update(categoriaId: string, id: string, body: CambiosHorario) {
  const actual = await getById(categoriaId, id);
  if (segundos(body.horaFin ?? actual.horaFin) <= segundos(body.horaInicio ?? actual.horaInicio)) {
    throw ApiError.badRequest('La hora final debe ser posterior');
  }
  if (body.dia !== undefined) await checkDia(categoriaId, body.dia, id);
  let horario;
  try { horario = await repository.update(categoriaId, id, body); }
  catch (error: any) {
    if (error?.code === '23505') throw ApiError.conflict('Ya existe un horario para ese dia en la categoria');
    if (error?.code === '23514') throw ApiError.badRequest('La hora final debe ser posterior a la inicial');
    throw error;
  }
  if (!horario) throw ApiError.notFound('Horario no encontrado');
  return horario;
}
export async function remove(categoriaId: string, id: string) {
  await categoriaById(categoriaId);
  try {
    if (!await repository.remove(categoriaId, id)) throw ApiError.notFound('Horario no encontrado');
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
      throw ApiError.conflict('El horario tiene registros asociados y no puede eliminarse');
    }
    throw error;
  }
}
