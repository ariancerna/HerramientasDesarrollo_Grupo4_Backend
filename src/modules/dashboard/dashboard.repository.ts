import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';
import type { ActividadDashboard, PagoDashboard, ResumenAdmin, ResumenProfesor, ResumenAlumno } from './dashboard.types';
import { combinarActividades, estadoPago, ContextoDashboard, HorarioRow, EventoRow } from './dashboard.utils';

interface CategoriaRow { id: string; nombre: string }
interface AlumnoRow { id: string; nombres: string; apellidos: string; categoria_id: string | null; estado: string }
interface AsistenciaRow { id: string; alumno_id: string; categoria_id: string | null; fecha_hora: string; metodo: 'ESCANEO' | 'MANUAL' }
interface PagoRow {
  id: string; periodo: string; monto: number | string; estado: PagoDashboard['estado'];
  vencimiento: string | null; fecha_pago: string | null; metodo_pago: string | null;
}
interface EvaluacionRow {
  id: string; alumno_id: string; fecha: string; rendimiento_tecnico: number | null;
  rendimiento_fisico: number | null; actitud: number | null; observaciones: string;
}
interface AnuncioRow { id: string; titulo: string; mensaje: string; created_at: string }
interface Resultado<T> { data: T | null; error: unknown }

const LIMITE = 5;
const PAGINA = 500;
const CAMPOS_ALUMNO = 'id,nombres,apellidos,categoria_id,estado';
const CAMPOS_ASISTENCIA = 'id,alumno_id,categoria_id,fecha_hora,metodo';
const CAMPOS_PAGO = 'id,periodo,monto,estado,vencimiento,fecha_pago,metodo_pago';
const CAMPOS_EVENTO = 'id,titulo,fecha,hora_inicio,hora_fin,ubicacion,categoria_id';
const CAMPOS_EVALUACION = 'id,alumno_id,fecha,rendimiento_tecnico,rendimiento_fisico,actitud,observaciones';

async function filas<T>(consulta: PromiseLike<Resultado<T[]>>): Promise<T[]> {
  const { data, error } = await consulta;
  if (error) throw error;
  return data ?? [];
}

async function contar(consulta: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count, error } = await consulta;
  if (error) throw error;
  if (count === null) throw ApiError.internal('No se pudo calcular el resumen');
  return count;
}

/** Evita que el límite por defecto de PostgREST trunque padrones y asignaciones. */
async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<Resultado<T[]>>) {
  const acumuladas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const pagina = await filas(consulta(desde, desde + PAGINA - 1));
    acumuladas.push(...pagina);
    if (pagina.length < PAGINA) return acumuladas;
  }
}

/** Mantiene acotado el tamaño de los filtros IN en las URLs de PostgREST. */
async function porLotes<T>(ids: string[], consulta: (lote: string[]) => Promise<T[]>): Promise<T[]> {
  const resultados: T[] = [];
  for (let inicio = 0; inicio < ids.length; inicio += 100) {
    resultados.push(...await consulta(ids.slice(inicio, inicio + 100)));
  }
  return resultados;
}

export function crearDashboardRepository(client: SupabaseClient) {
  async function categorias(ids?: string[]) {
    if (ids?.length === 0) return [];
    return todas<CategoriaRow>((desde, hasta) => {
      let consulta = client.from('categorias').select('id,nombre').order('id');
      if (ids) consulta = consulta.in('id', ids);
      return consulta.range(desde, hasta).returns<CategoriaRow[]>();
    });
  }

  async function actividades(grupos: CategoriaRow[], contexto: ContextoDashboard, todasCategorias = false): Promise<ActividadDashboard[]> {
    const ids = grupos.map((grupo) => grupo.id);
    const horarios = ids.length ? todas<HorarioRow>((desde, hasta) => client.from('horarios')
      .select('id,categoria_id,dia,hora_inicio,hora_fin,cancha,estado').in('categoria_id', ids)
      .eq('estado', 'activo').order('id').range(desde, hasta).returns<HorarioRow[]>()) : Promise.resolve([]);
    let eventos = client.from('eventos').select(CAMPOS_EVENTO)
      .or(`fecha.gt.${contexto.hoy},and(fecha.eq.${contexto.hoy},hora_inicio.gte.${contexto.hora})`)
      .order('fecha').order('hora_inicio').order('id').limit(LIMITE);
    if (!todasCategorias) eventos = ids.length
      ? eventos.or(`categoria_id.is.null,categoria_id.in.(${ids.join(',')})`)
      : eventos.is('categoria_id', null);
    const [sesiones, eventosProximos] = await Promise.all([horarios, filas(eventos.returns<EventoRow[]>())]);
    return combinarActividades(grupos, sesiones, eventosProximos, contexto);
  }

  async function resumenAdmin(contexto: ContextoDashboard): Promise<ResumenAdmin> {
    const [total, activos, asistenciasHoy, pendientes, vencidos, pendientesVencidos, grupos, registros] = await Promise.all([
      contar(client.from('alumnos').select('id', { count: 'exact', head: true })),
      contar(client.from('alumnos').select('id', { count: 'exact', head: true }).eq('estado', 'activo')),
      contar(client.from('asistencias').select('id', { count: 'exact', head: true }).eq('fecha', contexto.hoy)),
      contar(client.from('pagos').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente')),
      contar(client.from('pagos').select('id', { count: 'exact', head: true }).eq('estado', 'vencido')),
      contar(client.from('pagos').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente').lt('vencimiento', contexto.hoy)),
      categorias(),
      filas(client.from('asistencias').select(CAMPOS_ASISTENCIA).order('fecha_hora', { ascending: false }).order('id').limit(LIMITE).returns<AsistenciaRow[]>()),
    ]);
    const idsAlumnos = [...new Set(registros.map((registro) => registro.alumno_id))];
    const [proximasActividades, alumnos] = await Promise.all([
      actividades(grupos, contexto, true),
      idsAlumnos.length ? filas(client.from('alumnos').select(CAMPOS_ALUMNO).in('id', idsAlumnos).returns<AlumnoRow[]>()) : Promise.resolve([]),
    ]);
    const nombres = new Map(alumnos.map((alumno) => [alumno.id, `${alumno.nombres} ${alumno.apellidos}`]));
    const nombreCategorias = new Map(grupos.map((grupo) => [grupo.id, grupo.nombre]));
    return {
      alumnos: { total, activos, inactivos: total - activos }, asistenciasHoy,
      pagos: { pendientes: pendientes - pendientesVencidos, vencidos: vencidos + pendientesVencidos },
      proximasActividades,
      ultimosRegistros: registros.map((registro) => ({
        id: registro.id, estudianteId: registro.alumno_id, estudiante: nombres.get(registro.alumno_id) ?? 'Alumno no disponible',
        categoria: registro.categoria_id ? nombreCategorias.get(registro.categoria_id) ?? null : null,
        fechaHora: registro.fecha_hora, metodo: registro.metodo,
      })),
    };
  }

  async function resumenProfesor(profesorId: string, contexto: ContextoDashboard): Promise<ResumenProfesor> {
    const { data: profesor, error } = await client.from('profesores').select('id').eq('id', profesorId).maybeSingle();
    if (error) throw error;
    if (!profesor) throw ApiError.notFound('No se encontró el perfil del profesor');
    const asignaciones = await todas<{ categoria_id: string }>((desde, hasta) => client.from('profesores_categorias')
      .select('categoria_id').eq('profesor_id', profesorId).order('categoria_id').range(desde, hasta).returns<{ categoria_id: string }[]>());
    const grupos = await categorias(asignaciones.map((asignacion) => asignacion.categoria_id));
    const idsCategorias = grupos.map((grupo) => grupo.id);
    const alumnos = idsCategorias.length ? await todas<{ id: string }>((desde, hasta) => client.from('alumnos')
      .select('id').in('categoria_id', idsCategorias).order('id').range(desde, hasta).returns<{ id: string }[]>()) : [];
    const idsAlumnos = alumnos.map((alumno) => alumno.id);
    const [proximasSesiones, evaluados, evaluaciones] = await Promise.all([
      actividades(grupos, contexto),
      porLotes(idsAlumnos, (lote) => todas<{ alumno_id: string }>((desde, hasta) => client.from('evaluaciones').select('alumno_id,id')
        .eq('profesor_id', profesorId).in('alumno_id', lote).order('id').range(desde, hasta).returns<{ alumno_id: string }[]>())),
      porLotes(idsAlumnos, (lote) => filas(client.from('evaluaciones').select(CAMPOS_EVALUACION).eq('profesor_id', profesorId)
        .in('alumno_id', lote).order('fecha', { ascending: false }).order('id').limit(LIMITE).returns<EvaluacionRow[]>())),
    ]);
    return {
      categorias: grupos, alumnosAsignados: alumnos.length,
      alumnosSinEvaluacion: alumnos.length - new Set(evaluados.map((evaluacion) => evaluacion.alumno_id)).size,
      proximasSesiones,
      misEvaluaciones: evaluaciones.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.id.localeCompare(b.id)).slice(0, LIMITE).map((evaluacion) => ({
        id: evaluacion.id, alumnoId: evaluacion.alumno_id, fecha: evaluacion.fecha,
        rendimientoTecnico: evaluacion.rendimiento_tecnico, rendimientoFisico: evaluacion.rendimiento_fisico,
        actitud: evaluacion.actitud, observaciones: evaluacion.observaciones,
      })),
    };
  }

  async function resumenAlumno(estudianteId: string, contexto: ContextoDashboard): Promise<ResumenAlumno> {
    const { data: alumno, error } = await client.from('alumnos').select('id,categoria_id').eq('id', estudianteId).maybeSingle();
    if (error) throw error;
    if (!alumno) throw ApiError.notFound('No se encontró el perfil del alumno');
    const [mensualidades, asistenciasDelMes, asistencias, pagos, destinatarios, grupos] = await Promise.all([
      filas(client.from('pagos').select(CAMPOS_PAGO).eq('alumno_id', estudianteId).order('periodo', { ascending: false }).limit(1).returns<PagoRow[]>()),
      contar(client.from('asistencias').select('id', { count: 'exact', head: true }).eq('alumno_id', estudianteId)
        .gte('fecha', contexto.inicioMes).lt('fecha', contexto.siguienteMes)),
      filas(client.from('asistencias').select(CAMPOS_ASISTENCIA).eq('alumno_id', estudianteId)
        .order('fecha_hora', { ascending: false }).order('id').limit(LIMITE).returns<AsistenciaRow[]>()),
      filas(client.from('pagos').select(CAMPOS_PAGO).eq('alumno_id', estudianteId).eq('estado', 'pagado')
        .not('fecha_pago', 'is', null).order('fecha_pago', { ascending: false }).order('id').limit(LIMITE).returns<PagoRow[]>()),
      todas<{ anuncio_id: string }>((desde, hasta) => client.from('anuncios_destinatarios').select('anuncio_id')
        .eq('alumno_id', estudianteId).order('anuncio_id').range(desde, hasta).returns<{ anuncio_id: string }[]>()),
      categorias(alumno.categoria_id ? [alumno.categoria_id] : []),
    ]);
    const idsAnuncios = destinatarios.map((destinatario) => destinatario.anuncio_id);
    const [proximas, anuncios] = await Promise.all([
      actividades(grupos, contexto),
      porLotes(idsAnuncios, (lote) => filas(client.from('anuncios').select('id,titulo,mensaje,created_at').in('id', lote)
        .eq('estado', 'enviado').order('created_at', { ascending: false }).order('id').limit(LIMITE).returns<AnuncioRow[]>())),
    ]);
    const mensualidad = mensualidades[0];
    return {
      mensualidadActual: mensualidad ? {
        id: mensualidad.id, periodo: mensualidad.periodo, monto: Number(mensualidad.monto),
        estado: estadoPago(mensualidad.estado, mensualidad.vencimiento, contexto.hoy),
        vencimiento: mensualidad.vencimiento, fechaPago: mensualidad.fecha_pago, metodoPago: mensualidad.metodo_pago,
      } : null,
      asistenciasDelMes, proximaActividad: proximas[0] ?? null,
      anuncios: anuncios.sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)).slice(0, LIMITE)
        .map((anuncio) => ({ id: anuncio.id, titulo: anuncio.titulo, mensaje: anuncio.mensaje, fechaCreacion: anuncio.created_at })),
      movimientos: [
        ...asistencias.map((registro) => ({ id: registro.id, tipo: 'asistencia' as const, fecha: registro.fecha_hora,
          titulo: 'Asistencia registrada', detalle: registro.metodo === 'ESCANEO' ? 'Registro por escaneo' : 'Registro manual' })),
        ...pagos.map((pago) => ({ id: pago.id, tipo: 'pago' as const, fecha: `${pago.fecha_pago}T12:00:00-05:00`,
          titulo: 'Pago registrado', detalle: `Mensualidad ${pago.periodo}` })),
      ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime() || a.id.localeCompare(b.id)).slice(0, LIMITE),
    };
  }

  return { resumenAdmin, resumenProfesor, resumenAlumno };
}

export const dashboardRepository = crearDashboardRepository(supabaseAdmin);
