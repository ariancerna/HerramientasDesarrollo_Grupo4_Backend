import { NextFunction, Request, Response } from 'express';
import { created, ok } from '../../lib/utils/response';
import { ApiError } from '../../lib/errors/api-error';
import { RUTAS_FRONT } from '../../lib/utils/rutas-front';
import * as service from './pagos.service';
import type { EstadoMensualQuery } from './pagos.schema';
import { notificarAlumnos } from '../notificaciones/notificaciones.repository';

/** Contrato del front (PagoMensualidad): camelCase y alumno_id → estudianteId. */
function presentar(pago: unknown): unknown {
  if (Array.isArray(pago)) return pago.map(presentar);
  if (!pago || typeof pago !== 'object') return pago;
  return Object.fromEntries(Object.entries(pago).map(([clave, valor]) => [
    clave === 'alumno_id' ? 'estudianteId' : clave.replace(/_([a-z])/g, (_m, letra: string) => letra.toUpperCase()),
    clave === 'monto' && valor !== null ? Number(valor) : valor,
  ]));
}

async function avisarPago(pago: { alumno_id?: string; periodo?: string } | null) {
  if (!pago?.alumno_id) return;
  await notificarAlumnos([pago.alumno_id], {
    titulo: 'Pago registrado', tipo: 'pago', href: RUTAS_FRONT.pagosAlumno,
    descripcion: `Se registró el pago de tu mensualidad ${pago.periodo ?? ''}`.trim(),
  });
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, presentar(await service.list(req.query)));
  } catch (err) {
    next(err);
  }
}

export async function estadoMensual(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await service.estadoMensual(req.query as unknown as EstadoMensualQuery));
  } catch (err) {
    next(err);
  }
}

export async function pagoActual(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, presentar(await service.pagoActual(req.user)));
  } catch (err) {
    next(err);
  }
}

export async function history(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, presentar(await service.history(req.user)));
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, presentar(await service.getById(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    created(res, presentar(await service.create(req.body)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, presentar(await service.update(req.params.id, req.body)));
  } catch (err) {
    next(err);
  }
}

export async function registrarPorId(req: Request, res: Response, next: NextFunction) {
  try {
    const pago = await service.registrarPorId(req.params.id, req.body);
    await avisarPago(pago as { alumno_id?: string; periodo?: string } | null);
    ok(res, presentar(pago));
  } catch (err) {
    next(err);
  }
}

export async function registrarDirecto(req: Request, res: Response, next: NextFunction) {
  try {
    const resultado = await service.registrarDirecto(req.body);
    await avisarPago(resultado.pago as { alumno_id?: string; periodo?: string } | null);
    if (resultado.creado) {
      created(res, presentar(resultado.pago));
      return;
    }
    ok(res, presentar(resultado.pago));
  } catch (err) {
    next(err);
  }
}

export async function marcarPendiente(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, presentar(await service.marcarPendiente(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function generarMensualidad(req: Request, res: Response, next: NextFunction) {
  try {
    const generado = await service.generarMensualidad(req.body);
    const resultado = { ...generado, pagos: presentar(generado.pagos) };
    if (resultado.generados > 0) {
      created(res, resultado);
      return;
    }
    ok(res, resultado);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
