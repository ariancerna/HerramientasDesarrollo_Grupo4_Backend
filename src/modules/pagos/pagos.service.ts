import { z, ZodError } from 'zod';
import { ApiError } from '../../lib/errors/api-error';
import type { AuthUser } from '../../types/express';
import * as repository from './pagos.repository';
import type { CrearPagoRepositoryInput, DetallePagoRegistrado } from './pagos.repository';
import {
  actualizarPagoSchema,
  crearPagoSchema,
  estadoMensualQuerySchema,
  generarMensualidadSchema,
  registrarPagoDirectoSchema,
  registrarPagoSchema,
} from './pagos.schema';

type PagosRepository = typeof repository;

function fechaActualEnLima(ahora: Date) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)!.value;
  return {
    periodo: `${valor('year')}-${valor('month')}`,
    fecha: `${valor('year')}-${valor('month')}-${valor('day')}`,
  };
}

export function periodoActualEnLima(ahora = new Date()): string {
  return fechaActualEnLima(ahora).periodo;
}

export function crearPagosService(repo: PagosRepository = repository, reloj = () => new Date()) {
  function validar<T>(schema: z.ZodType<T>, value: unknown, mensaje: string): T {
    try {
      return schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw ApiError.badRequest(mensaje, error.flatten().fieldErrors);
      }
      throw error;
    }
  }

  /** Completa monto y vencimiento con la configuración del club (CFG-03) si no se envían. */
  async function valoresClub(periodo: string, monto?: number, vencimiento?: string) {
    if (monto !== undefined && vencimiento !== undefined) return { monto, vencimiento };
    const config = repo.findClubConfig ? await repo.findClubConfig() : null;
    if (!config) return { ...(monto === undefined ? {} : { monto }), ...(vencimiento === undefined ? {} : { vencimiento }) };
    return {
      monto: monto ?? config.monto,
      vencimiento: vencimiento ?? `${periodo}-${String(config.diaVencimiento).padStart(2, '0')}`,
    };
  }

  async function list(filters: Record<string, unknown>) {
    return repo.findAll(filters);
  }

  async function getById(id: string) {
    const pago = await repo.findById(id);
    if (!pago) throw ApiError.notFound('Pago no encontrado');
    return pago;
  }

  async function create(payload: unknown) {
    const datos = validar(crearPagoSchema, payload, 'Datos inválidos');
    return repo.create({ ...datos, ...await valoresClub(datos.periodo, datos.monto, datos.vencimiento), estado: 'pendiente' });
  }

  async function estadoMensual(query: Record<string, unknown>) {
    const { periodo, texto, filtro } = validar(estadoMensualQuerySchema, query, 'Parámetros inválidos');
    const activos = await repo.findActiveStudents();
    const busqueda = texto?.toLocaleLowerCase('es').trim();
    const alumnos = busqueda
      ? activos.filter((alumno) =>
        `${alumno.nombres} ${alumno.apellidos} ${alumno.dni} ${alumno.codigo ?? ''}`
          .toLocaleLowerCase('es').includes(busqueda))
      : activos;
    const pagos = await repo.findByPeriodForStudents(periodo, alumnos.map((alumno) => alumno.id));
    const pagoPorAlumno = new Map(pagos.map((pago) => [pago.alumno_id, pago]));
    const filas = alumnos.map((alumno) => {
      const pago = pagoPorAlumno.get(alumno.id) ?? null;
      return {
        estudianteId: alumno.id,
        nombres: alumno.nombres,
        apellidos: alumno.apellidos,
        nombreCompleto: `${alumno.nombres} ${alumno.apellidos}`,
        dni: alumno.dni,
        codigo: alumno.codigo,
        estado: pago?.estado ?? 'sin_cargo',
        pago: pago ? {
          id: pago.id,
          periodo: pago.periodo,
          monto: Number(pago.monto),
          estado: pago.estado,
          fechaPago: pago.fecha_pago,
          metodoPago: pago.metodo_pago,
          codigoOperacion: pago.codigo_operacion,
          vencimiento: pago.vencimiento,
        } : null,
      };
    });
    const resultado = filas.filter((fila) =>
      filtro === 'todos' || (filtro === 'alDia' ? fila.estado === 'pagado' : fila.estado !== 'pagado'));

    return {
      periodo,
      filtro,
      totales: {
        alumnos: resultado.length,
        alDia: resultado.filter((alumno) => alumno.estado === 'pagado').length,
        porPagar: resultado.filter((alumno) => alumno.estado !== 'pagado').length,
      },
      alumnos: resultado,
    };
  }

  async function pagoActual(usuario: AuthUser) {
    if (!usuario.estudianteId) {
      throw ApiError.forbidden('Tu cuenta no tiene un alumno vinculado. Contacta a un administrador.');
    }
    return repo.findCurrentForStudent(usuario.estudianteId, fechaActualEnLima(reloj()).periodo);
  }

  async function history(usuario: AuthUser) {
    if (!usuario.estudianteId) {
      throw ApiError.forbidden('Tu cuenta no tiene un alumno vinculado. Contacta a un administrador.');
    }
    return repo.findHistoryForStudent(usuario.estudianteId);
  }

  async function update(id: string, payload: unknown) {
    const datos = validar(actualizarPagoSchema, payload, 'Datos inválidos');
    return repo.update(id, datos);
  }

  async function registrarPorId(id: string, payload: unknown) {
    const datos = validar(registrarPagoSchema, payload, 'Datos inválidos');
    const detalle: DetallePagoRegistrado = {
      estado: 'pagado',
      fechaPago: fechaActualEnLima(reloj()).fecha,
      metodoPago: datos.metodoPago,
      codigoOperacion: datos.codigoOperacion ?? null,
    };
    return repo.updatePaymentDetails(id, detalle);
  }

  async function registrarDirecto(payload: unknown): Promise<{ pago: Awaited<ReturnType<typeof repo.create>>; creado: boolean }> {
    const datos = validar(registrarPagoDirectoSchema, payload, 'Datos inválidos');
    const fecha = fechaActualEnLima(reloj()).fecha;
    const detalle: DetallePagoRegistrado = {
      estado: 'pagado',
      fechaPago: fecha,
      metodoPago: datos.metodoPago,
      codigoOperacion: datos.codigoOperacion ?? null,
    };
    const existente = await repo.findCurrentForStudent(datos.estudianteId, datos.periodo);

    if (existente) {
      return { pago: await repo.updatePaymentDetails(existente.id, detalle), creado: false };
    }

    const nuevoPago: CrearPagoRepositoryInput = {
      estudianteId: datos.estudianteId,
      periodo: datos.periodo,
      ...await valoresClub(datos.periodo),
      estado: 'pagado',
      fechaPago: fecha,
      metodoPago: datos.metodoPago,
      codigoOperacion: datos.codigoOperacion ?? null,
    };
    try {
      return { pago: await repo.create(nuevoPago), creado: true };
    } catch (error) {
      if (!(error instanceof ApiError) || error.statusCode !== 409) throw error;
      const pagoConcurrente = await repo.findCurrentForStudent(datos.estudianteId, datos.periodo);
      if (!pagoConcurrente) throw error;
      return { pago: await repo.updatePaymentDetails(pagoConcurrente.id, detalle), creado: false };
    }
  }

  async function marcarPendiente(id: string) {
    return repo.updatePaymentDetails(id, {
      estado: 'pendiente',
      fechaPago: null,
      metodoPago: null,
      codigoOperacion: null,
    });
  }

  async function generarMensualidad(payload: unknown) {
    const datos = validar(generarMensualidadSchema, payload, 'Datos inválidos');
    const faltantes = await repo.findActiveStudentsWithoutPayment(datos.periodo);
    const valores = await valoresClub(datos.periodo, datos.monto, datos.vencimiento);
    const pagos = await repo.createManyIfMissing(faltantes.map((alumno) => ({
      estudianteId: alumno.id,
      periodo: datos.periodo,
      ...valores,
    })));
    return { periodo: datos.periodo, generados: pagos.length, pagos };
  }

  async function remove(id: string) {
    return repo.remove(id);
  }

  return {
    list,
    getById,
    create,
    estadoMensual,
    pagoActual,
    history,
    update,
    registrarPorId,
    registrarDirecto,
    marcarPendiente,
    generarMensualidad,
    remove,
  };
}

export const {
  list,
  getById,
  create,
  estadoMensual,
  pagoActual,
  history,
  update,
  registrarPorId,
  registrarDirecto,
  marcarPendiente,
  generarMensualidad,
  remove,
} = crearPagosService();
