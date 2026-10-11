import { z } from 'zod';

export const diasHorario = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;
const horaSchema = z.string().regex(
  /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
  'La hora debe usar HH:mm o HH:mm:ss (00:00 a 23:59:59)',
).transform((hora) => hora.length === 5 ? hora + ':00' : hora);

export const actualizarHorarioSchema = z.object({
  dia: z.string().trim().toLowerCase().pipe(z.enum(diasHorario)).optional(),
  horaInicio: horaSchema.optional(),
  horaFin: horaSchema.optional(),
  cancha: z.string().trim().min(1, 'La cancha no puede estar vacía')
    .max(200, 'La cancha no puede exceder 200 caracteres').nullable().optional(),
  estado: z.enum(['activo', 'cancelado']).optional(),
}).strict().refine((payload) => Object.keys(payload).length > 0, {
  message: 'Envía al menos un campo para actualizar',
});

export type ActualizarHorarioInput = z.infer<typeof actualizarHorarioSchema>;

export const horarioParamsSchema = z.object({
  id: z.string().uuid('La categoría debe tener un UUID válido'),
  horarioId: z.string().uuid('El horario debe tener un UUID válido'),
});
