import { z } from 'zod';

// El body llega en camelCase (igual que alumnos/pagos: categoriaId, estudianteId); el repository lo mapea a snake_case.
// Las notas son 1–10 porque así lo exige el CHECK de la tabla `evaluaciones`.
const uuidSchema = z.string().uuid('Debe ser un UUID válido');
const fechaSchema = z.string().date('La fecha debe ser válida y tener formato AAAA-MM-DD');
const notaSchema = z.number().int('La nota debe ser un número entero').min(1, 'La nota mínima es 1').max(10, 'La nota máxima es 10');

// POST /evaluaciones (EVA-02). `.strict()`: un campo desconocido responde 400 en vez de ignorarse en silencio.
export const crearEvaluacionSchema = z
  .object({
    alumnoId: uuidSchema,
    // Solo lo envía un ADM. Si evalúa un PROF, se toma de su sesión.
    profesorId: uuidSchema.optional(),
    fecha: fechaSchema,
    rendimientoTecnico: notaSchema,
    rendimientoFisico: notaSchema,
    actitud: notaSchema,
    // La columna es NOT NULL en la BD.
    observaciones: z.string().trim().min(1, 'Las observaciones son obligatorias').max(1000),
  })
  .strict();

// PUT /evaluaciones/:id (EVA-03): todo opcional; no se puede reasignar alumno ni profesor (enviarlos da 400).
export const actualizarEvaluacionSchema = crearEvaluacionSchema
  .omit({ alumnoId: true, profesorId: true })
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, 'Debes indicar al menos un campo para actualizar');

// GET /evaluaciones (EVA-01)
export const listarEvaluacionesQuerySchema = z
  .object({
    alumnoId: uuidSchema.optional(),
    profesorId: uuidSchema.optional(),
    desde: fechaSchema.optional(),
    hasta: fechaSchema.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict()
  .refine((q) => !q.desde || !q.hasta || q.desde <= q.hasta, 'desde no puede ser posterior a hasta');

export const evaluacionIdParamsSchema = z.object({ id: uuidSchema }).strict();

export type CrearEvaluacionInput = z.infer<typeof crearEvaluacionSchema>;
export type ActualizarEvaluacionInput = z.infer<typeof actualizarEvaluacionSchema>;
