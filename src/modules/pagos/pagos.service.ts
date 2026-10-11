import { ApiError } from '../../lib/errors/api-error';
import type { AuthUser } from '../../types/express';
import * as repository from './pagos.repository';
import type { CrearPagoInput, EstadoMensualQuery } from './pagos.schema';

type PagosRepository = typeof repository;

export function periodoActualEnLima(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(ahora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)!.value;
  return `${valor('year')}-${valor('month')}`;
}

export function crearPagosService(repo: PagosRepository = repository, reloj = () => new Date()) {
  async function estadoMensual({ periodo, texto, filtro }: EstadoMensualQuery) {
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
    return repo.findCurrentForStudent(usuario.estudianteId, periodoActualEnLima(reloj()));
  }

  return {
    list: (filters: Record<string, unknown>) => repo.findAll(filters),
    getById: (id: string) => repo.findById(id),
    create: (payload: CrearPagoInput) => repo.create(payload),
    update: (id: string, payload: Record<string, unknown>) => repo.update(id, payload),
    remove: (id: string) => repo.remove(id),
    estadoMensual,
    pagoActual,
  };
}

export const {
  list,
  getById,
  create,
  update,
  remove,
  estadoMensual,
  pagoActual,
} = crearPagosService();
