import { z } from 'zod';

export const categoriaParamsSchema = z.object({ id: z.string().uuid() });
export const categoriasQuerySchema = z.object({ texto: z.string().trim().max(100).optional() }).strict();
export const crearCategoriaSchema = z.object({
  nombre: z.string().trim().min(3).max(100),
  descripcion: z.string().trim().max(1000).nullable().optional(),
}).strict();
export const actualizarCategoriaSchema = crearCategoriaSchema.partial()
  .refine((body) => Object.keys(body).length > 0, 'Indica al menos un campo');
