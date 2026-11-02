import { z } from 'zod';
import { esFechaValida } from '../../lib/utils/fechas';

const fecha = z.string().refine(esFechaValida, 'Fecha inválida; usa YYYY-MM-DD');
const nota = z.number().int('La nota debe ser entera').min(1).max(10).nullable().optional();

export const evaluacionParamsSchema = z.object({ id: z.string().uuid() });

const campos = z.object({
  alumnoId: z.string().uuid(),
  fecha,
  rendimientoTecnico: nota,
  rendimientoFisico: nota,
  actitud: nota,
  observaciones: z.string().trim().min(1, 'Las observaciones son obligatorias').max(2000),
}).strict();

export const crearEvaluacionSchema = campos;

export const actualizarEvaluacionSchema = campos.partial()
  .refine((body) => Object.keys(body).length > 0, 'Indica al menos un campo');

export const listarEvaluacionesSchema = z.object({
  alumnoId: z.string().uuid().optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict().refine((q) => !q.desde || !q.hasta || q.desde <= q.hasta, {
  message: '"desde" no puede ser mayor que "hasta"', path: ['desde'],
});

export type NuevaEvaluacion = z.infer<typeof crearEvaluacionSchema>;
export type CambiosEvaluacion = z.infer<typeof actualizarEvaluacionSchema>;
export type FiltroEvaluaciones = z.infer<typeof listarEvaluacionesSchema>;
