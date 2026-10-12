import { z } from "zod";

export const AsistenciaSchema = z.object({
  alumno_id: z
    .string()
    .uuid({ message: "El ID del alumno debe ser un UUID válido" }),
  horario_id: z
    .string()
    .uuid({ message: "El ID del horario debe ser un UUID válido" }),
  fecha: z
    .string()
    .datetime({ message: "La fecha debe tener un formato ISO 8601 válido" }),
  estado: z.enum(["PRESENTE", "AUSENTE", "TARDANZA", "JUSTIFICADO"], {
    required_error: "El estado de la asistencia es obligatorio",
  }),
  observaciones: z.string().optional(),
});

export const ActualizarAsistenciaSchema = AsistenciaSchema.partial();

export type AsistenciaDTO = z.infer<typeof AsistenciaSchema>;
