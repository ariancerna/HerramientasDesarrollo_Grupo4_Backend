import { z } from 'zod';

export const crearCuentaSchema = z.object({
  usuario: z.string().min(3),
  password: z.string().min(6),
});

export const estadoSchema = z.object({
  activo: z.boolean(),
});
