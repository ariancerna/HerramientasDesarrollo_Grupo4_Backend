import { z } from 'zod';

export const horarioParamsSchema = z.object({
  id: z.string().uuid('La categoría debe tener un UUID válido'),
  horarioId: z.string().uuid('El horario debe tener un UUID válido'),
});
