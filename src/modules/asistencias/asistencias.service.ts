import { ApiError } from '../../lib/errors/api-error';
import { fechaEnLima } from '../../lib/utils/fechas';
import { RUTAS_FRONT } from '../../lib/utils/rutas-front';
import type { AuthUser } from '../../types/express';
import { findCategoriaIdsByProfesor } from '../alumnos/alumnos.repository';
import { notificarAlumnos } from '../notificaciones/notificaciones.repository';
import * as repository from './asistencias.repository';
import type { AsistenciaRow } from './asistencias.repository';
import type { CambiosAsistencia, FiltroAsistencias, FiltroMisAsistencias, NuevaAsistencia } from './asistencias.schema';

/** Forma de RegistroAsistencia que consume el front. */
async function presentar(rows: AsistenciaRow[]) {
  const detalles = await repository.findDetalles(
    rows.map((row) => row.alumno_id),
    rows.map((row) => row.categoria_id).filter((id): id is string => Boolean(id)),
  );
  return rows.map((row) => {
    const alumno = detalles.alumnos.get(row.alumno_id);
    return {
      id: row.id,
      estudianteId: row.alumno_id,
      estudiante: alumno ? `${alumno.nombres} ${alumno.apellidos}` : 'Alumno no disponible',
      dni: alumno?.dni ?? null,
      codigo: alumno?.codigo ?? null,
      categoriaId: row.categoria_id,
      categoria: row.categoria_id ? detalles.categorias.get(row.categoria_id) ?? null : null,
      fecha: row.fecha,
      fechaHora: row.fecha_hora,
      metodo: row.metodo,
    };
  });
}

function conflictoDuplicado(error: unknown): never {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    throw ApiError.conflict('El alumno ya tiene una asistencia registrada ese día');
  }
  throw error;
}

function categoriasDe(usuario: AuthUser) {
  return findCategoriaIdsByProfesor(usuario.profesorId ?? usuario.id);
}

/** ASI-01 */
export async function registrar(usuario: AuthUser, body: NuevaAsistencia) {
  const alumno = body.dni
    ? await repository.findAlumnoByDni(body.dni)
    : await repository.findAlumnoById(body.estudianteId!);
  if (!alumno) throw ApiError.notFound('Alumno no encontrado');

  if (usuario.rol === 'PROF') {
    const categorias = await categoriasDe(usuario);
    if (!alumno.categoria_id || !categorias.includes(alumno.categoria_id)) {
      throw ApiError.forbidden('El alumno no pertenece a tus categorías');
    }
  }
  if (alumno.estado !== 'activo') throw ApiError.unprocessable('El alumno está inactivo');

  const instante = body.fechaHora ? new Date(body.fechaHora) : new Date();
  if (instante.getTime() > Date.now() + 5 * 60 * 1000) {
    throw ApiError.unprocessable('La fecha y hora no puede estar en el futuro');
  }
  const fecha = fechaEnLima(instante);
  if (await repository.existeEnFecha(alumno.id, fecha)) {
    throw ApiError.conflict('El alumno ya tiene una asistencia registrada ese día');
  }

  let row: AsistenciaRow;
  try {
    row = await repository.create({
      alumno_id: alumno.id, categoria_id: alumno.categoria_id, fecha,
      fecha_hora: instante.toISOString(), metodo: body.metodo,
    });
  } catch (error) { conflictoDuplicado(error); }

  await notificarAlumnos([alumno.id], {
    titulo: 'Asistencia registrada', tipo: 'asistencia', href: RUTAS_FRONT.asistenciaAlumno,
    descripcion: `Se registró tu asistencia del ${fecha}.`,
  });
  return (await presentar([row]))[0];
}

/** ASI-02 */
export async function listar(usuario: AuthUser, filtro: FiltroAsistencias) {
  const from = (filtro.page - 1) * filtro.limit;
  const vacio = { data: [], meta: { page: filtro.page, limit: filtro.limit, total: 0 } };

  let categoriaIds: string[] | undefined;
  if (usuario.rol === 'PROF') {
    categoriaIds = await categoriasDe(usuario);
    if (filtro.categoriaId && !categoriaIds.includes(filtro.categoriaId)) {
      throw ApiError.forbidden('Solo puedes consultar tus categorías');
    }
    if (categoriaIds.length === 0) return vacio;
  }

  let alumnoIds: string[] | undefined;
  if (filtro.texto) {
    alumnoIds = await repository.findAlumnoIdsByTexto(filtro.texto);
    if (alumnoIds.length === 0) return vacio;
  }

  const { rows, total } = await repository.findAll({
    alumnoIds, categoriaIds, categoriaId: filtro.categoriaId, fecha: filtro.fecha,
    from, to: from + filtro.limit - 1,
  });
  return { data: await presentar(rows), meta: { page: filtro.page, limit: filtro.limit, total } };
}

/** ASI-03 */
export async function corregir(id: string, cambios: CambiosAsistencia) {
  const actual = await repository.findById(id);
  if (!actual) throw ApiError.notFound('Asistencia no encontrada');

  const update: Parameters<typeof repository.update>[1] = {};
  if (cambios.metodo) update.metodo = cambios.metodo;
  if (cambios.fechaHora) {
    const instante = new Date(cambios.fechaHora);
    update.fecha_hora = instante.toISOString();
    update.fecha = fechaEnLima(instante);
    if (await repository.existeEnFecha(actual.alumno_id, update.fecha, id)) {
      throw ApiError.conflict('El alumno ya tiene otra asistencia registrada ese día');
    }
  }

  let row: AsistenciaRow | null;
  try { row = await repository.update(id, update); } catch (error) { conflictoDuplicado(error); }
  if (!row) throw ApiError.notFound('Asistencia no encontrada');
  return (await presentar([row]))[0];
}

/** ASI-04 */
export async function anular(id: string) {
  if (!await repository.remove(id)) throw ApiError.notFound('Asistencia no encontrada');
}

/** ASI-05 */
export async function misAsistencias(usuario: AuthUser, filtro: FiltroMisAsistencias) {
  if (!usuario.estudianteId) {
    throw ApiError.forbidden('Tu cuenta no tiene un alumno vinculado. Contacta a un administrador.');
  }
  const from = (filtro.page - 1) * filtro.limit;
  const { rows, total } = await repository.findAll({
    alumnoIds: [usuario.estudianteId], desde: filtro.desde, hasta: filtro.hasta, metodo: filtro.metodo,
    from, to: from + filtro.limit - 1,
  });
  return { data: await presentar(rows), meta: { page: filtro.page, limit: filtro.limit, total } };
}
