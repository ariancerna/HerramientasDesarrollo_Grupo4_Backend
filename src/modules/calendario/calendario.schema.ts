import { z } from "zod";

export const CalendarioSchema = z.object({
  titulo: z
    .string()
    .min(3, { message: "El título debe tener al menos 3 caracteres" }),
  fecha: z.string({ required_error: "La fecha es obligatoria" }), // Formato YYYY-MM-DD o ISO
  hora_inicio: z.string({ required_error: "La hora de inicio es obligatoria" }),
  hora_fin: z.string({ required_error: "La hora de fin es obligatoria" }),
  ubicacion: z.string().optional(),
  categoria_id: z
    .string()
    .uuid({ message: "El ID de la categoría debe ser un UUID válido" })
    .optional(),
  descripcion: z.string().optional(),
});

export const ActualizarCalendarioSchema = CalendarioSchema.partial();

export type CalendarioDTO = z.infer<typeof CalendarioSchema>;
