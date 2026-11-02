import { z } from 'zod';

const puntaje = z.number().int().min(1, 'El puntaje mínimo es 1').max(10, 'El puntaje máximo es 10').nullable().optional();

export const crearEvaluacionSchema = z.object({
  alumnoId: z.string().uuid('El alumno no es un UUID válido'),
  fecha: z.string().date('La fecha debe tener formato AAAA-MM-DD'),
  rendimientoTecnico: puntaje,
  rendimientoFisico: puntaje,
  actitud: puntaje,
  observaciones: z.string().trim().min(1, 'Las observaciones son obligatorias'),
});

export const actualizarEvaluacionSchema = crearEvaluacionSchema.partial();

export type NuevaEvaluacion = z.infer<typeof crearEvaluacionSchema>;
export type CambiosEvaluacion = z.infer<typeof actualizarEvaluacionSchema>;
