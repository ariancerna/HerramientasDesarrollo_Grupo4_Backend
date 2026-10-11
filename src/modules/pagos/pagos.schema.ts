import { z } from 'zod';

const periodoSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El período debe tener formato AAAA-MM');
const uuidSchema = z.string().uuid('El estudianteId debe ser un UUID válido');

export const crearPagoSchema = z.object({
  estudianteId: uuidSchema,
  periodo: periodoSchema,
  monto: z.number().positive().finite().optional(),
  vencimiento: z.string().date().optional(),
}).strict();

export const estadoMensualQuerySchema = z.object({
  periodo: periodoSchema,
  texto: z.string().trim().max(100).optional(),
  filtro: z.enum(['todos', 'alDia', 'porPagar']).default('todos'),
}).strict();

export const actualizarPagoSchema = z.object({
  monto: z.number().positive().finite().optional(),
  vencimiento: z.string().date().nullable().optional(),
}).strict().refine((payload) => Object.keys(payload).length > 0, 'Debes indicar al menos un campo para actualizar');

export type CrearPagoInput = z.infer<typeof crearPagoSchema>;
export type EstadoMensualQuery = z.infer<typeof estadoMensualQuerySchema>;
