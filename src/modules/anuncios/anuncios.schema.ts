import { z } from 'zod';

export const crearAnuncioSchema = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(150),
  mensaje: z.string().trim().min(1, 'El mensaje es obligatorio'),
  categoriaId: z.string().uuid('La categoría no es un UUID válido').nullable().optional(),
  destinatarios: z.array(z.string().uuid('Destinatario inválido')).min(1, 'Selecciona al menos un destinatario'),
  estado: z.enum(['borrador', 'enviado']).default('borrador'),
});

export const actualizarAnuncioSchema = crearAnuncioSchema.partial();

export type NuevoAnuncio = z.infer<typeof crearAnuncioSchema>;
export type CambiosAnuncio = z.infer<typeof actualizarAnuncioSchema>;
