import { z } from 'zod';

const dniSchema = z.string().regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos');
const telefonoSchema = z.string().regex(/^\d{9}$/, 'El teléfono debe tener exactamente 9 dígitos').optional();

export const crearAlumnoSchema = z.object({
  dni: dniSchema,
  nombres: z.string().trim().min(1, 'Los nombres son obligatorios'),
  apellidos: z.string().trim().min(1, 'Los apellidos son obligatorios'),
  email: z.string().trim().email('El email no es válido'),
  codigo: z.string().trim().min(1, 'El código es obligatorio'),
  telefono: telefonoSchema,
  categoriaId: z.string().uuid('La categoría no es un UUID válido'),
  estado: z.enum(['activo', 'inactivo']).default('activo'),
});

export const actualizarAlumnoSchema = crearAlumnoSchema.partial();
