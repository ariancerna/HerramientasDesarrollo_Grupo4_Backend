import { z } from 'zod';

const enteroQuery = (defaultValue: string, max: number) => z.string()
  .regex(/^[1-9]\d*$/, 'Debe ser un entero positivo')
  .default(defaultValue).transform(Number).pipe(z.number().int().min(1).max(max));
export const alumnosQuerySchema = z.object({
  texto: z.string().trim().max(100).refine((value) => !/[\x00-\x1f*]/.test(value),
    'El texto no admite caracteres de control ni comodines').optional(),
  categoriaId: z.string().uuid().optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
  page: enteroQuery('1', 1_000_000),
  limit: enteroQuery('20', 100),
}).strict();

export const alumnoParamsSchema = z.object({ id: z.string().uuid('El alumno debe tener un UUID válido') });

const dniSchema =z.string().regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos');
const telefonoSchema = z.string().regex(/^\d{9}$/, 'El teléfono debe tener exactamente 9 dígitos').optional();

export const crearAlumnoSchema = z.object({
  dni: dniSchema,
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios'),
  apellidos: z.string().trim().min(1, 'Los apellidos son obligatorios'),
  email: z.string().trim().email('El email no es válido'),
  // Decisión #4: si no se envía, el backend lo autogenera (GC-AAAA-NNN).
  codigo: z.string().trim().min(1, 'El código no puede estar vacío').optional(),
  telefono: telefonoSchema,
  categoriaId: z.string().uuid('La categoría no es un UUID válido'),
  estado: z.enum(['activo', 'inactivo']).default('activo'),
});

export const actualizarAlumnoSchema = crearAlumnoSchema.partial();

export const cambiarEstadoAlumnoSchema = z.object({
  estado: z.enum(['activo', 'inactivo'], {
    required_error: 'El estado es obligatorio',
    invalid_type_error: 'El estado debe ser activo o inactivo',
  }),
});

export const actualizarPerfilAlumnoSchema = z.object({
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios').optional(),
  apellidos: z.string().trim().min(1, 'Los apellidos son obligatorios').optional(),
  email: z.string().trim().email('El email no es válido').optional(),
  telefono: z.string().regex(/^\d{9}$/, 'El teléfono debe tener exactamente 9 dígitos').optional(),
});
