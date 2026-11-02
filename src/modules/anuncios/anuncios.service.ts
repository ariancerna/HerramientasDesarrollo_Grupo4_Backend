import { ApiError } from '../../lib/errors/api-error';
import { RUTAS_FRONT } from '../../lib/utils/rutas-front';
import type { AuthUser } from '../../types/express';
import { findCategoriaIdsByProfesor } from '../alumnos/alumnos.repository';
import { notificarAlumnos } from '../notificaciones/notificaciones.repository';
import * as repository from './anuncios.repository';
import type { AnuncioRow } from './anuncios.repository';
import type { CambiosAnuncio, FiltroAnuncios, FiltroMisAnuncios, NuevoAnuncio } from './anuncios.schema';

const profesorDe = (usuario: AuthUser) => usuario.profesorId ?? usuario.id;

async function presentar(rows: AnuncioRow[], incluirDestinatarios = true) {
  const [destinatarios, nombres] = await Promise.all([
    incluirDestinatarios ? repository.destinatarios(rows.map((row) => row.id)) : Promise.resolve(new Map<string, string[]>()),
    repository.nombres(rows.map((row) => row.profesor_id),
      rows.map((row) => row.categoria_id).filter((id): id is string => Boolean(id))),
  ]);
  return rows.map((row) => ({
    id: row.id,
    titulo: row.titulo,
    mensaje: row.mensaje,
    estado: row.estado,
    categoriaId: row.categoria_id,
    categoria: row.categoria_id ? nombres.categorias.get(row.categoria_id) ?? null : null,
    profesorId: row.profesor_id,
    profesor: nombres.profesores.get(row.profesor_id) ?? null,
    ...(incluirDestinatarios ? { destinatarios: destinatarios.get(row.id) ?? [] } : {}),
    fechaCreacion: row.created_at,
  }));
}

/** Destinatarios y categoría deben pertenecer a las categorías del profesor. */
async function validarAlcance(usuario: AuthUser, alumnoIds?: string[], categoriaId?: string | null) {
  const categorias = await findCategoriaIdsByProfesor(profesorDe(usuario));
  if (categoriaId && !categorias.includes(categoriaId)) {
    throw ApiError.forbidden('La categoría no está asignada a ti');
  }
  if (!alumnoIds) return;
  const alumnos = await repository.alumnos(alumnoIds);
  if (alumnos.length !== alumnoIds.length) throw ApiError.badRequest('Algún destinatario no existe');
  if (alumnos.some((alumno) => !alumno.categoria_id || !categorias.includes(alumno.categoria_id))) {
    throw ApiError.forbidden('Solo puedes enviar anuncios a alumnos de tus categorías');
  }
}

async function propio(usuario: AuthUser, id: string) {
  const anuncio = await repository.findById(id);
  if (!anuncio) throw ApiError.notFound('Anuncio no encontrado');
  if (anuncio.profesor_id !== profesorDe(usuario)) throw ApiError.forbidden('Solo el autor puede modificar este anuncio');
  return anuncio;
}

async function notificar(anuncio: AnuncioRow) {
  const alumnoIds = (await repository.destinatarios([anuncio.id])).get(anuncio.id) ?? [];
  await notificarAlumnos(alumnoIds, {
    titulo: `Nuevo anuncio: ${anuncio.titulo}`.slice(0, 200), tipo: 'anuncio', href: RUTAS_FRONT.anunciosAlumno,
    descripcion: anuncio.mensaje.slice(0, 280),
  });
}

/** ANU-01 */
export async function listar(usuario: AuthUser, filtro: FiltroAnuncios) {
  const from = (filtro.page - 1) * filtro.limit;
  const { rows, total } = await repository.findByProfesor(profesorDe(usuario), filtro.estado, from, from + filtro.limit - 1);
  return { data: await presentar(rows), meta: { page: filtro.page, limit: filtro.limit, total } };
}

/** ANU-02 */
export async function crear(usuario: AuthUser, body: NuevoAnuncio) {
  await validarAlcance(usuario, body.destinatarios, body.categoriaId);
  let anuncio: AnuncioRow;
  try {
    anuncio = await repository.create({
      profesor_id: profesorDe(usuario), titulo: body.titulo, mensaje: body.mensaje,
      categoria_id: body.categoriaId ?? null, estado: 'borrador',
    });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
      throw ApiError.forbidden('Tu cuenta no tiene un perfil de profesor válido');
    }
    throw error;
  }
  try {
    await repository.reemplazarDestinatarios(anuncio.id, body.destinatarios);
  } catch (error) {
    await repository.remove(anuncio.id); // compensación: no dejar anuncios sin destinatarios
    throw error;
  }
  if (body.estado === 'enviado') {
    anuncio = (await repository.marcarEnviado(anuncio.id)) ?? anuncio;
    await notificar(anuncio);
  }
  return (await presentar([anuncio]))[0];
}

/** ANU-03 */
export async function editar(usuario: AuthUser, id: string, body: CambiosAnuncio) {
  const actual = await propio(usuario, id);
  if (actual.estado === 'enviado' && body.estado === 'borrador') {
    throw ApiError.conflict('Un anuncio enviado no puede volver a borrador');
  }
  await validarAlcance(usuario, body.destinatarios, body.categoriaId);

  const cambios: Parameters<typeof repository.update>[1] = {};
  if (body.titulo !== undefined) cambios.titulo = body.titulo;
  if (body.mensaje !== undefined) cambios.mensaje = body.mensaje;
  if (body.categoriaId !== undefined) cambios.categoria_id = body.categoriaId;
  let anuncio = Object.keys(cambios).length ? await repository.update(id, cambios) : actual;
  if (!anuncio) throw ApiError.notFound('Anuncio no encontrado');
  if (body.destinatarios) await repository.reemplazarDestinatarios(id, body.destinatarios);

  if (actual.estado === 'borrador' && body.estado === 'enviado') {
    const enviado = await repository.marcarEnviado(id);
    if (enviado) { anuncio = enviado; await notificar(enviado); }
  }
  return (await presentar([anuncio]))[0];
}

/** ANU-04 */
export async function eliminar(usuario: AuthUser, id: string) {
  await propio(usuario, id);
  await repository.remove(id);
}

/** ANU-05 — borrador → enviado y genera las notificaciones. */
export async function enviar(usuario: AuthUser, id: string) {
  const actual = await propio(usuario, id);
  if (actual.estado === 'enviado') throw ApiError.conflict('El anuncio ya fue enviado');
  const anuncio = await repository.marcarEnviado(id);
  if (!anuncio) throw ApiError.conflict('El anuncio ya fue enviado');
  await notificar(anuncio);
  return (await presentar([anuncio]))[0];
}

/** ANU-06 */
export async function misAnuncios(usuario: AuthUser, filtro: FiltroMisAnuncios) {
  if (!usuario.estudianteId) {
    throw ApiError.forbidden('Tu cuenta no tiene un alumno vinculado. Contacta a un administrador.');
  }
  return presentar(await repository.enviadosA(usuario.estudianteId, filtro.limite), false);
}
