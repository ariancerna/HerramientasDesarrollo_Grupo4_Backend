import { z } from 'zod';

// TODO: reemplazar por los campos reales de evento (ver docs/ENDPOINTS.md, módulo CALENDARIO).
export const crearEventoSchema = z.object({});

export const actualizarEventoSchema = crearEventoSchema.partial();
