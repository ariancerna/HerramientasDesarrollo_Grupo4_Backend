import { z } from "zod";

const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: "La hora debe tener formato HH:mm" });

export const CalendarioSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, { message: "El título debe tener al menos 3 caracteres" }),
  fecha: z.string({ required_error: "La fecha es obligatoria" }).date("La fecha debe tener formato AAAA-MM-DD"),
  horaInicio: horaSchema,
  horaFin: horaSchema.nullable().optional(),
  ubicacion: z.string().trim().min(1, { message: "La ubicación es obligatoria" }),
  categoriaId: z
    .string()
    .uuid({ message: "El ID de la categoría debe ser un UUID válido" })
    .nullable()
    .optional(),
  descripcion: z.string().optional(),
});

export const ActualizarCalendarioSchema = CalendarioSchema.partial();

export type CalendarioDTO = z.infer<typeof CalendarioSchema>;
export type ActualizarCalendarioDTO = z.infer<typeof ActualizarCalendarioSchema>;
