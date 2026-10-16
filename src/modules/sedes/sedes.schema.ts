import { z } from 'zod';
export const sedeParamsSchema = z.object({ id: z.string().uuid('La sede debe tener un UUID válido') });

export const crearSedeSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  direccion: z.string().trim().max(300).nullable().optional(),
}).strict();

export const actualizarSedeSchema = crearSedeSchema.partial()
  .refine((body) => Object.keys(body).length > 0, 'Indica al menos un campo');
