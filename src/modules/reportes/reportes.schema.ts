import { z } from 'zod';

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Fecha inválida; usa YYYY-MM-DD');

export const filtroAsistenciaBaseSchema = z
  .object({
    categoriaId: z.string().uuid().optional(),
    desde: fechaSchema,
    hasta: fechaSchema,
    metodo: z.enum(['ESCANEO', 'MANUAL']).optional(),
  }).strict();

/** REP-02 acepta además ?formato=csv (único formato disponible). */
export const exportAsistenciaSchema = filtroAsistenciaBaseSchema.extend({
  formato: z.literal('csv').default('csv'),
}).strict();

export const filtroAsistenciaSchema = filtroAsistenciaBaseSchema
  .refine((v) => v.desde <= v.hasta, { message: '"desde" no puede ser mayor que "hasta"', path: ['desde'] });

export type FiltroAsistencia = z.infer<typeof filtroAsistenciaSchema>;
