import { z } from 'zod';
const nombre = z.string().trim().min(1).max(150);
const usuario = z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9._-]+$/);
const categoriaIds = z.array(z.string().uuid()).max(100).refine((ids) => new Set(ids).size === ids.length, 'No repitas categorias');
export const profesorParamsSchema = z.object({ id: z.string().uuid() });
export const profesoresQuerySchema = z.object({ texto: z.string().trim().max(100).optional(), sedeId: z.string().uuid().optional() }).strict();
export const crearProfesorSchema = z.object({
  nombre, usuario, email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(72), sedeId: z.string().uuid(), categoriaIds: categoriaIds.default([]),
}).strict();
// PRF-04: password opcional y sincroniza categoriaIds[] (lista del PDF).
export const actualizarProfesorSchema = z.object({
  nombre: nombre.optional(), usuario: usuario.optional(), sedeId: z.string().uuid().optional(),
  password: z.string().min(6).max(72).optional(), categoriaIds: categoriaIds.optional(),
}).strict()
  .refine((body) => Object.keys(body).length > 0, 'Indica al menos un campo');
export const asignarCategoriasSchema = z.object({ categoriaIds }).strict();
export type NuevoProfesor = z.infer<typeof crearProfesorSchema>;
export type CambiosProfesor = z.infer<typeof actualizarProfesorSchema>;
