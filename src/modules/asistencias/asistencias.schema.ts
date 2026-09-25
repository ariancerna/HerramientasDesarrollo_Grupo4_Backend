import { z } from 'zod';

// TODO: reemplazar por los campos reales de asistencia (ver docs/ENDPOINTS.md, módulo ASISTENCIAS).
export const crearAsistenciaSchema = z.object({});

export const actualizarAsistenciaSchema = crearAsistenciaSchema.partial();
