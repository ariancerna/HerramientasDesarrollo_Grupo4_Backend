import { z } from 'zod';

// TODO: reemplazar por los campos reales de alumno (ver docs/ENDPOINTS.md, módulo ALUMNOS).
export const crearAlumnoSchema = z.object({});

export const actualizarAlumnoSchema = crearAlumnoSchema.partial();
