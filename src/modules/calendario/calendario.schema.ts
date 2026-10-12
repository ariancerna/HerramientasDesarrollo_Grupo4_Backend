import { z } from "zod";

export const CalendarioSchema = z.object({
  titulo: z
    .string()
    .min(3, { message: "El título debe tener al menos 3 caracteres" }),
  descripcion: z.string().optional(),
  fecha_inicio: z
    .string()
    .datetime({
      message: "La fecha de inicio debe tener un formato ISO 8601 válido",
    }),
  fecha_fin: z
    .string()
    .datetime({
      message: "La fecha de fin debe tener un formato ISO 8601 válido",
    }),
  tipo_evento: z.enum(["ENTRENAMIENTO", "PARTIDO", "REUNION", "OTRO"], {
    required_error: "El tipo de evento es obligatorio",
  }),
  sede_id: z
    .string()
    .uuid({ message: "El ID de la sede debe ser un UUID válido" })
    .optional(),
});

export const ActualizarCalendarioSchema = CalendarioSchema.partial();

export type CalendarioDTO = z.infer<typeof CalendarioSchema>;
