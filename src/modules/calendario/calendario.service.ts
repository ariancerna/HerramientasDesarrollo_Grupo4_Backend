import { supabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';
import type { AuthUser } from '../../types/express';
import { findCategoriaIdsByProfesor } from '../alumnos/alumnos.repository';
import { combinarActividades, contextoDashboard } from '../dashboard/dashboard.utils';
import * as repository from './calendario.repository';
import type { EventoCompletoRow } from './calendario.repository';
import type { CambiosEvento, FiltroActividades, FiltroEventos, NuevoEvento } from './calendario.schema';

async function presentar(rows: EventoCompletoRow[]) {
  const ids = [...new Set(rows.map((row) => row.categoria_id).filter((id): id is string => Boolean(id)))];
  const nombres = new Map((await repository.categorias(ids)).map((cat) => [cat.id, cat.nombre]));
  return rows.map((row) => ({
    id: row.id,
    titulo: row.titulo,
    fecha: row.fecha,
    horaInicio: row.hora_inicio.slice(0, 5),
    horaFin: row.hora_fin?.slice(0, 5) ?? null,
    ubicacion: row.ubicacion,
    categoriaId: row.categoria_id,
    categoria: row.categoria_id ? nombres.get(row.categoria_id) ?? null : null,
    descripcion: row.descripcion,
  }));
}

function errorBaseDatos(error: unknown): never {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    if (error.code === '23503') throw ApiError.badRequest('La categoría indicada no existe');
    if (error.code === '23514') throw ApiError.badRequest('La hora final debe ser posterior a la inicial');
  }
  throw error;
}

/** CAL-01 */
export async function listar(filtro: FiltroEventos) {
  return presentar(await repository.findAll(filtro));
}

/** CAL-02 */
export async function crear(body: NuevoEvento) {
  try { return (await presentar([await repository.create(body)]))[0]; } catch (error) { return errorBaseDatos(error); }
}

/** CAL-03 */
export async function editar(id: string, body: CambiosEvento) {
  const actual = await repository.findById(id);
  if (!actual) throw ApiError.notFound('Evento no encontrado');
  const inicio = body.horaInicio ?? actual.hora_inicio.slice(0, 5);
  const fin = body.horaFin === undefined ? actual.hora_fin?.slice(0, 5) : body.horaFin;
  if (fin && fin <= inicio) throw ApiError.badRequest('La hora final debe ser posterior a la inicial');
  let row: EventoCompletoRow | null;
  try { row = await repository.update(id, body); } catch (error) { return errorBaseDatos(error); }
  if (!row) throw ApiError.notFound('Evento no encontrado');
  return (await presentar([row]))[0];
}

/** CAL-04 */
export async function eliminar(id: string) {
  if (!await repository.remove(id)) throw ApiError.notFound('Evento no encontrado');
}

/** Categorías que el usuario puede ver en el calendario (undefined = todas, solo ADM). */
async function alcance(usuario: AuthUser, categoriaId?: string): Promise<string[] | undefined> {
  if (usuario.rol === 'ADM') return categoriaId ? [categoriaId] : undefined;

  let propias: string[];
  if (usuario.rol === 'PROF') {
    propias = await findCategoriaIdsByProfesor(usuario.profesorId ?? usuario.id);
  } else {
    if (!usuario.estudianteId) {
      throw ApiError.forbidden('Tu cuenta no tiene un alumno vinculado. Contacta a un administrador.');
    }
    const { data, error } = await supabaseAdmin.from('alumnos').select('categoria_id')
      .eq('id', usuario.estudianteId).maybeSingle();
    if (error) throw error;
    propias = data?.categoria_id ? [data.categoria_id as string] : [];
  }
  if (categoriaId && !propias.includes(categoriaId)) {
    throw ApiError.forbidden('Solo puedes consultar el calendario de tus categorías');
  }
  return categoriaId ? [categoriaId] : propias;
}

/** CAL-05 — entrenamientos (horarios activos, próximos 35 días) + eventos, ordenados. */
export async function actividades(usuario: AuthUser, filtro: FiltroActividades) {
  const contexto = contextoDashboard();
  const ids = await alcance(usuario, filtro.categoriaId);
  const categorias = await repository.categorias(ids);
  const [horarios, eventos] = await Promise.all([
    filtro.tipo === 'evento' ? [] : repository.horariosActivos(categorias.map((cat) => cat.id)),
    filtro.tipo === 'entrenamiento' ? [] : repository.eventosProximos(contexto.hoy, contexto.hora, filtro.limite, ids),
  ]);
  // Los eventos generales (sin categoría) también necesitan el nombre de las categorías que sí tengan.
  const extra = eventos.map((evento) => evento.categoria_id)
    .filter((id): id is string => Boolean(id) && !categorias.some((cat) => cat.id === id));
  const nombres = extra.length ? [...categorias, ...await repository.categorias([...new Set(extra)])] : categorias;
  return combinarActividades(nombres, horarios, eventos, contexto, filtro.limite);
}
