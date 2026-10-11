import { z } from 'zod';

const periodoSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El período debe tener formato AAAA-MM');
const uuidSchema = z.string().uuid('Debe ser un UUID válido');
const montoSchema = z.number().positive('El monto debe ser mayor que cero').finite('El monto debe ser finito');
const fechaSchema = z.string().date('La fecha debe ser válida y tener formato AAAA-MM-DD');

export const metodoPagoSchema = z.enum(['Yape', 'Plin', 'Transferencia', 'Efectivo']);

export const crearPagoSchema = z.object({
  estudianteId: uuidSchema,
  periodo: periodoSchema,
  monto: montoSchema.optional(),
  vencimiento: fechaSchema.optional(),
}).strict();

export const listarPagosQuerySchema = z.object({
  periodo: periodoSchema.optional(),
  estado: z.enum(['pendiente', 'pagado', 'vencido']).optional(),
  estudianteId: uuidSchema.optional(),
}).strict();

export const estadoMensualQuerySchema = z.object({
  periodo: periodoSchema,
  texto: z.string().trim().max(100).optional(),
  filtro: z.enum(['todos', 'alDia', 'porPagar']).default('todos'),
}).strict();

export const pagoIdParamsSchema = z.object({
  id: uuidSchema,
}).strict();

export const registrarPagoSchema = z.object({
  metodoPago: metodoPagoSchema,
  codigoOperacion: z.string().trim().min(1).max(100).optional(),
}).strict();

export const registrarPagoDirectoSchema = z.object({
  estudianteId: uuidSchema,
  periodo: periodoSchema,
  ...registrarPagoSchema.shape,
}).strict();

export const generarMensualidadSchema = z.object({
  periodo: periodoSchema,
  monto: montoSchema.optional(),
  vencimiento: fechaSchema.optional(),
}).strict();

export const actualizarPagoSchema = z.object({
  monto: montoSchema.optional(),
  vencimiento: fechaSchema.nullable().optional(),
}).strict().refine((payload) => Object.keys(payload).length > 0, 'Debes indicar al menos un campo para actualizar');

export type CrearPagoInput = z.infer<typeof crearPagoSchema>;
export type EstadoMensualQuery = z.infer<typeof estadoMensualQuerySchema>;
