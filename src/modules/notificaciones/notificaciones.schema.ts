import { z } from 'zod';

export const notificacionParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const listarNotificacionesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  leida: z.enum(['true', 'false']).optional(),
  // Nombre usado en la lista de endpoints (NOT-01): soloNoLeidas=true equivale a leida=false.
  soloNoLeidas: z.enum(['true', 'false']).optional(),
}).strict().transform(({ soloNoLeidas, ...filtro }) => (
  soloNoLeidas === 'true' && filtro.leida === undefined ? { ...filtro, leida: 'false' as const } : filtro
));

export const crearNotificacionSchema = z.object({
  usuarioId: z.string().uuid(),
  titulo: z.string().trim().min(1).max(200),
  descripcion: z.string().trim().max(2000).nullable().optional(),
  tipo: z.string().trim().min(1).max(50).nullable().optional(),
  href: z.string().trim().max(500)
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), 'Usa una ruta interna del club')
    .nullable().optional(),
}).strict();

export type FiltroNotificaciones = z.infer<typeof listarNotificacionesSchema>;
export type CrearNotificacion = z.infer<typeof crearNotificacionSchema>;
