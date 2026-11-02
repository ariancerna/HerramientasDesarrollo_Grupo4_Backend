import { z } from "zod";

const metodoSchema = z.enum(["ESCANEO", "MANUAL"], {
  required_error: "El método de registro es obligatorio",
  invalid_type_error: "El método debe ser ESCANEO o MANUAL",
});

const fechaHoraSchema = z
  .string()
  .datetime({ offset: true, message: "La fecha debe tener un formato ISO 8601 válido" });

export const AsistenciaSchema = z.object({
  alumnoId: z
    .string()
    .uuid({ message: "El ID del alumno debe ser un UUID válido" }),
  fechaHora: fechaHoraSchema.optional(),
  metodo: metodoSchema,
});

export const ActualizarAsistenciaSchema = z.object({
  fechaHora: fechaHoraSchema,
  metodo: metodoSchema,
});

export type AsistenciaDTO = z.infer<typeof AsistenciaSchema>;
export type ActualizarAsistenciaDTO = z.infer<typeof ActualizarAsistenciaSchema>;
