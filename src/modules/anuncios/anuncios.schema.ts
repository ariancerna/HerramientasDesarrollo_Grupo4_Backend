import { z } from 'zod';

// TODO: reemplazar por los campos reales de anuncio (ver docs/ENDPOINTS.md, módulo ANUNCIOS).
export const crearAnuncioSchema = z.object({});

export const actualizarAnuncioSchema = crearAnuncioSchema.partial();
