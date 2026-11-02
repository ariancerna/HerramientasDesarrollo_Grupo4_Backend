import { z } from 'zod';
import { esFechaValida } from '../../lib/utils/fechas';

const fecha = z.string().refine(esFechaValida, 'Fecha inválida; usa YYYY-MM-DD');
const fechaHora = z.string().datetime({ offset: true, message: 'fechaHora debe ser ISO 8601' });
const metodo = z.enum(['ESCANEO', 'MANUAL']);
const entero = (porDefecto: number, max: number) => z.coerce.number().int().min(1).max(max).default(porDefecto);

export const asistenciaParamsSchema = z.object({ id: z.string().uuid() });

/** ASI-01: se identifica al alumno por DNI (escáner) o por su id (registro manual). */
export const crearAsistenciaSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos').optional(),
  estudianteId: z.string().uuid().optional(),
  metodo,
  fechaHora: fechaHora.optional(),
}).strict().refine((body) => Boolean(body.dni) !== Boolean(body.estudianteId), {
  message: 'Envía dni o estudianteId (solo uno)', path: ['dni'],
});

export const listarAsistenciasSchema = z.object({
  texto: z.string().trim().max(100).optional(),
  categoriaId: z.string().uuid().optional(),
  fecha: fecha.optional(),
  page: entero(1, 1_000_000),
  limit: entero(20, 100),
}).strict();

export const actualizarAsistenciaSchema = z.object({
  fechaHora: fechaHora.optional(),
  metodo: metodo.optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'Indica al menos un campo');

export const misAsistenciasSchema = z.object({
  desde: fecha.optional(),
  hasta: fecha.optional(),
  metodo: metodo.optional(),
  page: entero(1, 1_000_000),
  limit: entero(20, 100),
}).strict().refine((q) => !q.desde || !q.hasta || q.desde <= q.hasta, {
  message: '"desde" no puede ser mayor que "hasta"', path: ['desde'],
});

export type NuevaAsistencia = z.infer<typeof crearAsistenciaSchema>;
export type FiltroAsistencias = z.infer<typeof listarAsistenciasSchema>;
export type CambiosAsistencia = z.infer<typeof actualizarAsistenciaSchema>;
export type FiltroMisAsistencias = z.infer<typeof misAsistenciasSchema>;
