import { z } from 'zod';
import { crearHorarioSchema } from '../horarios/horarios.schema';

// CAT-03/04: horarios[] opcional; un horario por día (índice horarios_categoria_dia_unique).
const horarios = z.array(crearHorarioSchema).max(7)
  .refine((lista) => new Set(lista.map((h) => h.dia)).size === lista.length, 'Solo un horario por día');

export const categoriaParamsSchema = z.object({ id: z.string().uuid() });
export const categoriasQuerySchema = z.object({ texto: z.string().trim().max(100).optional() }).strict();
export const crearCategoriaSchema = z.object({
  nombre: z.string().trim().min(3).max(100),
  descripcion: z.string().trim().max(1000).nullable().optional(),
  horarios: horarios.optional(),
}).strict();
export const actualizarCategoriaSchema = crearCategoriaSchema.partial()
  .refine((body) => Object.keys(body).length > 0, 'Indica al menos un campo');
