import { z } from 'zod';

export const crearSedeSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  direccion: z.string().optional(),
});

export const actualizarSedeSchema = crearSedeSchema.partial();