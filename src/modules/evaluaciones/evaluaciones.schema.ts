import { z } from 'zod';

// TODO: reemplazar por los campos reales de evaluacion (ver docs/ENDPOINTS.md, módulo EVALUACIONES).
export const crearEvaluacionSchema = z.object({});

export const actualizarEvaluacionSchema = crearEvaluacionSchema.partial();
