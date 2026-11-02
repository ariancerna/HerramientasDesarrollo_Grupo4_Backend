import { z } from 'zod';

const destinatarios = z.array(z.string().uuid()).min(1, 'Elige al menos un destinatario').max(500)
  .refine((ids) => new Set(ids).size === ids.length, 'No repitas destinatarios');

export const anuncioParamsSchema = z.object({ id: z.string().uuid() });

export const crearAnuncioSchema = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(150),
  mensaje: z.string().trim().min(1, 'El mensaje es obligatorio').max(5000),
  destinatarios,
  categoriaId: z.string().uuid().nullable().optional(),
  estado: z.enum(['borrador', 'enviado']).default('borrador'),
}).strict();

export const actualizarAnuncioSchema = z.object({
  titulo: z.string().trim().min(1).max(150).optional(),
  mensaje: z.string().trim().min(1).max(5000).optional(),
  destinatarios: destinatarios.optional(),
  categoriaId: z.string().uuid().nullable().optional(),
  estado: z.enum(['borrador', 'enviado']).optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'Indica al menos un campo');

export const listarAnunciosSchema = z.object({
  estado: z.enum(['borrador', 'enviado']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const misAnunciosSchema = z.object({
  limite: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export type NuevoAnuncio = z.infer<typeof crearAnuncioSchema>;
export type CambiosAnuncio = z.infer<typeof actualizarAnuncioSchema>;
export type FiltroAnuncios = z.infer<typeof listarAnunciosSchema>;
export type FiltroMisAnuncios = z.infer<typeof misAnunciosSchema>;
