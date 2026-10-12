import { z } from 'zod';
const dias = ['lunes', 'martes', 'mi\u00e9rcoles', 'jueves', 'viernes', 's\u00e1bado', 'domingo'] as const;
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usa HH:mm');
const fields = z.object({
  dia: z.string().trim().toLowerCase().pipe(z.enum(dias)),
  horaInicio: hora, horaFin: hora,
  cancha: z.string().trim().max(100).nullable().optional(),
  estado: z.enum(['activo', 'cancelado']).default('activo'),
}).strict();
export const crearHorarioSchema = fields.refine((body) => body.horaFin > body.horaInicio, 'La hora final debe ser posterior');
export const actualizarHorarioSchema = fields.partial()
  .refine((body) => Object.keys(body).length > 0, 'Indica al menos un campo')
  .refine((body) => !body.horaInicio || !body.horaFin || body.horaFin > body.horaInicio, 'La hora final debe ser posterior');
export const horarioParamsSchema = z.object({ id: z.string().uuid(), horarioId: z.string().uuid() });
export const horariosQuerySchema = z.object({ estado: z.enum(['activo', 'cancelado']).optional() }).strict();
export type NuevoHorario = z.infer<typeof crearHorarioSchema>;
export type CambiosHorario = z.infer<typeof actualizarHorarioSchema>;
