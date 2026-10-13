import { z } from 'zod';

export const crearCuentaSchema = z.object({
  usuario: z.string().trim().min(3).max(50),
  password: z.string().min(6),
}).strict();
export const alumnoCuentaParamsSchema = z.object({ id: z.string().uuid() });

export const estadoSchema = z.object({
  activo: z.boolean(),
});

export const resetPasswordSchema = z.object({
  nuevaPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
