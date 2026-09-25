import { z } from 'zod';

// TODO: reemplazar por los campos reales de categoria (ver docs/ENDPOINTS.md, módulo CATEGORIAS).
export const crearCategoriaSchema = z.object({});

export const actualizarCategoriaSchema = crearCategoriaSchema.partial();
