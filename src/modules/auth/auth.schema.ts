import { z } from 'zod';

export const loginSchema = z.object({
  usuario: z.string().min(1, 'El usuario es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z.object({
  nombre: z.string().min(1),
  usuario: z.string().min(3),
  password: z.string().min(6),
});

export const forgotPasswordSchema = z.object({
  correo: z.string().email(),
});

export const verifyCodeSchema = z.object({
  correo: z.string().email(),
  codigo: z.string().length(6),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  nuevaPassword: z.string().min(6),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
