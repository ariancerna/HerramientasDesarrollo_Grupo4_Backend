import { z } from 'zod';

export const loginSchema = z.object({
  usuario: z.string().min(1, 'El usuario es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos'),
  usuario: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const forgotPasswordSchema = z.object({
  correo: z.string().email(),
});

export const verifyCodeSchema = z.object({
  correo: z.string().email(),
  codigo: z.string().length(6),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().uuid(),
  nuevaPassword: z.string().min(6),
});

export const changePasswordSchema = z.object({
  passwordActual: z.string().min(1),
  passwordNueva: z.string().min(6),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});