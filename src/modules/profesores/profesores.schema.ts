import { z } from 'zod';

// TODO: reemplazar por los campos reales de profesor (ver docs/ENDPOINTS.md, módulo PROFESORES).
export const crearProfesorSchema = z.object({});

export const actualizarProfesorSchema = crearProfesorSchema.partial();
