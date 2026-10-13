import { z } from 'zod';
export const miConfigQuerySchema = z.object({}).strict();

export const miConfigSchema = z.object({
  tema: z.enum(['claro', 'oscuro', 'sistema']).optional(),
  notificacionesSilenciadas: z.boolean().optional(),
});

export const configClubSchema = z.object({
  montoMensualidad: z.number().positive().optional(),
  diaVencimiento: z.number().int().min(1).max(28).optional(),
});
