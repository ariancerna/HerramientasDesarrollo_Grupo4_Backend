import { NextFunction, Request, Response } from 'express';
import { ok } from '../../lib/utils/response';
import * as service from './reportes.service';
import { ApiError } from '../../lib/errors/api-error';
import type { FiltroAsistencia } from './reportes.schema';

/** REP-01: un rango invertido es 422 (validación de negocio), no 400. */
export function validarRango(req: Request, _res: Response, next: NextFunction) {
  const { desde, hasta } = req.query as { desde: string; hasta: string };
  if (desde > hasta) return next(ApiError.unprocessable('"desde" no puede ser mayor que "hasta"'));
  next();
}

export async function asistencia(req: Request, res: Response, next: NextFunction) {
  try {
    const filtros = req.query as unknown as FiltroAsistencia;
    ok(res, await service.reporteAsistencia(filtros));
  } catch (err) {
    next(err);
  }
}

export async function exportarAsistencia(req: Request, res: Response, next: NextFunction) {
  try {
    const { formato: _formato, ...filtros } = req.query as unknown as FiltroAsistencia & { formato: 'csv' };
    const csv = await service.exportarAsistenciaCsv(filtros);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-asistencia.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
