import { z } from 'zod';
const dias = ['lunes', 'martes', 'mi\u00e9rcoles', 'jueves', 'viernes', 's\u00e1bado', 'domingo'] as const;
export const diasHorario = dias;
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usa HH:mm');
const fields = z.object({
  dia: z.string().trim().toLowerCase().pipe(z.enum(dias)),
  horaInicio: hora, horaFin: hora,
  cancha: z.string().trim().max(100).nullable().optional(),
  estado: z.enum(['activo', 'cancelado']).default('activo'),
}).strict();
export const crearHorarioSchema = fields.refine((body) => body.horaFin > body.horaInicio, 'La hora final debe ser posterior');
export const actualizarHorarioSchema = fields.partial()
  .extend({
    horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      .transform((hora) => hora.length === 5 ? hora + ':00' : hora).optional(),
    horaFin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      .transform((hora) => hora.length === 5 ? hora + ':00' : hora).optional(),
    cancha: z.string().trim().min(1).max(200).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Envía al menos un campo para actualizar')
  .refine((body) => !body.horaInicio || !body.horaFin || body.horaFin > body.horaInicio, 'La hora final debe ser posterior');
export const horarioParamsSchema = z.object({ id: z.string().uuid(), horarioId: z.string().uuid() });
export const horariosQuerySchema = z.object({ estado: z.enum(['activo', 'cancelado']).optional() }).strict();
export const estadoHorarioSchema = z.object({ estado: z.enum(['activo', 'cancelado']) }).strict();
const sinTildes = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const misHorariosQuerySchema = z.object({
  dia: z.string().trim().toLowerCase()
    .refine((dia) => dias.some((valido) => sinTildes(valido) === sinTildes(dia)), 'Día inválido').optional(),
}).strict();
export type NuevoHorario = z.infer<typeof crearHorarioSchema>;
export type CambiosHorario = z.infer<typeof actualizarHorarioSchema>;
