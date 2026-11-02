import { z } from 'zod';
import { esFechaValida } from '../../lib/utils/fechas';

const fecha = z.string().refine(esFechaValida, 'Fecha inválida; usa YYYY-MM-DD');
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usa HH:mm');

const campos = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(150),
  fecha,
  horaInicio: hora,
  horaFin: hora.nullable().optional(),
  ubicacion: z.string().trim().min(1, 'La ubicación es obligatoria').max(200),
  categoriaId: z.string().uuid().nullable().optional(),
  descripcion: z.string().trim().max(2000).nullable().optional(),
}).strict();

const horasValidas = (body: { horaInicio?: string; horaFin?: string | null }) =>
  !body.horaInicio || !body.horaFin || body.horaFin > body.horaInicio;

export const eventoParamsSchema = z.object({ id: z.string().uuid() });

export const crearEventoSchema = campos.refine(horasValidas, {
  message: 'La hora final debe ser posterior a la inicial', path: ['horaFin'],
});

export const actualizarEventoSchema = campos.partial()
  .refine((body) => Object.keys(body).length > 0, 'Indica al menos un campo')
  .refine(horasValidas, { message: 'La hora final debe ser posterior a la inicial', path: ['horaFin'] });

export const listarEventosSchema = z.object({
  desde: fecha.optional(),
  hasta: fecha.optional(),
  categoriaId: z.string().uuid().optional(),
}).strict().refine((q) => !q.desde || !q.hasta || q.desde <= q.hasta, {
  message: '"desde" no puede ser mayor que "hasta"', path: ['desde'],
});

export const actividadesSchema = z.object({
  categoriaId: z.string().uuid().optional(),
  tipo: z.enum(['entrenamiento', 'evento']).optional(),
  limite: z.coerce.number().int().min(1).max(100).default(10),
}).strict();

export type NuevoEvento = z.infer<typeof crearEventoSchema>;
export type CambiosEvento = z.infer<typeof actualizarEventoSchema>;
export type FiltroEventos = z.infer<typeof listarEventosSchema>;
export type FiltroActividades = z.infer<typeof actividadesSchema>;
