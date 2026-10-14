import { z } from 'zod';

// El CHECK de la tabla `anuncios` solo permite estos dos estados.
export const ESTADOS_ANUNCIO = ['borrador', 'enviado'] as const;

const uuidSchema = z.string().uuid('Debe ser un UUID válido');

// Campos comunes. El body llega en camelCase y el repository lo mapea a snake_case.
const base = z.object({
  titulo: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres').max(150),
  mensaje: z.string().trim().min(1, 'El mensaje es obligatorio').max(2000),
  categoriaId: uuidSchema.optional(),
  // Destinatarios explícitos. Si no se envía, se usan los alumnos activos de categoriaId.
  alumnoIds: z.array(uuidSchema).optional(),
});

// POST /anuncios (ANU-02). `.strict()`: un campo desconocido responde 400 en vez de ignorarse.
export const crearAnuncioSchema = base
  .extend({
    estado: z.enum(ESTADOS_ANUNCIO).default('borrador'),
    // Solo lo envía un ADM (la columna es NOT NULL). Si publica un PROF, sale de su sesión.
    profesorId: uuidSchema.optional(),
  })
  .strict();

// PUT /anuncios/:id (ANU-03): todo opcional. `estado` se declara aquí SIN default
// para que un PUT parcial no vuelva a poner el anuncio en "borrador" sin querer.
export const actualizarAnuncioSchema = base
  .extend({ estado: z.enum(ESTADOS_ANUNCIO) })
  .partial()
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, 'Debes indicar al menos un campo para actualizar');

// GET /anuncios (ANU-01)
export const listarAnunciosQuerySchema = z
  .object({
    categoriaId: uuidSchema.optional(),
    estado: z.enum(ESTADOS_ANUNCIO).optional(),
    profesorId: uuidSchema.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const anuncioIdParamsSchema = z.object({ id: uuidSchema }).strict();

export type CrearAnuncioInput = z.infer<typeof crearAnuncioSchema>;
export type ActualizarAnuncioInput = z.infer<typeof actualizarAnuncioSchema>;
