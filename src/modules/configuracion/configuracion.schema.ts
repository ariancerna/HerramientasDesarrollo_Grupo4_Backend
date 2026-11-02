import { z } from 'zod';
export const miConfigQuerySchema = z.object({}).strict();

export const miConfigSchema = z.object({
  tema: z.enum(['claro', 'oscuro', 'sistema']).optional(),
  notificacionesSilenciadas: z.boolean().optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'Envía al menos una preferencia para actualizar');
export type CambiosMiConfiguracion = z.infer<typeof miConfigSchema>;

export const configClubSchema = z.object({
  montoMensualidad: z.number().positive().optional(),
  diaVencimiento: z.number().int().min(1).max(28).optional(),
});
