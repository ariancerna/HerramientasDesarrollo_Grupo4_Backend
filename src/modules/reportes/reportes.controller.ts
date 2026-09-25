import { NextFunction, Request, Response } from 'express';
import { ok } from '../../lib/utils/response';
import * as service from './reportes.service';
import { filtroAsistenciaSchema } from './reportes.schema';

export async function asistencia(req: Request, res: Response, next: NextFunction) {
  try {
    const filtros = filtroAsistenciaSchema.parse(req.query);
    ok(res, await service.reporteAsistencia(filtros));
  } catch (err) {
    next(err);
  }
}

export async function exportarAsistencia(req: Request, res: Response, next: NextFunction) {
  try {
    const filtros = filtroAsistenciaSchema.parse(req.query);
    const csv = await service.exportarAsistenciaCsv(filtros);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-asistencia.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
