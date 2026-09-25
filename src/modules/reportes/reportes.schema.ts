import { z } from 'zod';

export const filtroAsistenciaSchema = z
  .object({
    categoriaId: z.string().uuid().optional(),
    desde: z.string(), // YYYY-MM-DD
    hasta: z.string(),
    metodo: z.enum(['ESCANEO', 'MANUAL']).optional(),
  })
  .refine((v) => v.desde <= v.hasta, { message: '"desde" no puede ser mayor que "hasta"', path: ['desde'] });
