import { z } from 'zod';

export const loginSchema = z.object({
  usuario: z.string().min(1, 'El usuario es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos'),
  usuario: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres').max(50),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
}).strict();

// El correo se normaliza (sin espacios y en minúsculas) para que el código
// se guarde y se verifique siempre con la misma clave.
const correoRecuperacion = z.string().trim().toLowerCase().email('Ingresa un correo válido');

export const forgotPasswordSchema = z.object({
  correo: correoRecuperacion,
});

export const verifyCodeSchema = z.object({
  correo: correoRecuperacion,
  codigo: z.string().trim().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().uuid(),
  nuevaPassword: z.string().min(6),
});

export const changePasswordSchema = z.object({
  passwordActual: z.string().min(1),
  passwordNueva: z.string().min(6),
}).strict().refine((body) => body.passwordActual !== body.passwordNueva, {
  message: 'La nueva contraseña debe ser distinta de la actual', path: ['passwordNueva'],
});

export const usuarioDisponibleSchema = z.object({
  usuario: z.string().trim().min(1, 'Indica el usuario').max(50),
  excluirId: z.string().uuid().optional(),
}).strict();

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/** AUTH-12 — a dónde vuelve Supabase tras autenticar con Google (debe estar en su lista de Redirect URLs). */
export const googleUrlQuerySchema = z.object({
  redirectTo: z.string().url('redirectTo debe ser una URL válida')
    .refine((valor) => /^https?:\/\//.test(valor), 'redirectTo debe usar http o https'),
}).strict();

/** AUTH-13 — tokens que Supabase entrega al front después de autenticar con Google. */
export const googleLoginSchema = z.object({
  accessToken: z.string().min(1, 'Falta el accessToken'),
  refreshToken: z.string().min(1, 'Falta el refreshToken'),
}).strict();
