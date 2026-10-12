import { ApiError } from '../../lib/errors/api-error';
import { getById as categoriaById } from '../categorias/categorias.service';
import * as repository from './horarios.repository';
import { CambiosHorario, NuevoHorario } from './horarios.schema';
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
  return repository.create(categoriaId, body);
}
export async function update(categoriaId: string, id: string, body: CambiosHorario) {
  const actual = await getById(categoriaId, id);
  if ((body.horaFin ?? actual.horaFin) <= (body.horaInicio ?? actual.horaInicio)) {
    throw ApiError.badRequest('La hora final debe ser posterior');
  }
  if (body.dia !== undefined) await checkDia(categoriaId, body.dia, id);
  const horario = await repository.update(categoriaId, id, body);
  if (!horario) throw ApiError.notFound('Horario no encontrado');
  return horario;
}
export async function remove(categoriaId: string, id: string) {
  await categoriaById(categoriaId);
  if (!await repository.remove(categoriaId, id)) throw ApiError.notFound('Horario no encontrado');
}
