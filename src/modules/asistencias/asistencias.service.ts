import { ApiError } from "../../lib/errors/api-error";
import { AuthUser } from "../../types/express";
import { AsistenciasRepository } from "./asistencias.repository";
import { ActualizarAsistenciaDTO, AsistenciaDTO } from "./asistencias.schema";

const DUPLICADO = "Este estudiante ya tiene asistencia registrada en esa fecha.";

/** Día calendario en Lima: la restricción única (alumno_id, fecha) se evalúa con él. */
function fechaLima(fechaHora: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date(fechaHora));
}

function esDuplicado(error: any) {
  return error?.code === "23505";
}

export class AsistenciasService {
  static async obtenerTodas(user: AuthUser, alumnoId?: string) {
    if (user.rol === "ALU") {
      if (!user.estudianteId) return [];
      return AsistenciasRepository.findAll(user.estudianteId);
    }
    return AsistenciasRepository.findAll(alumnoId);
  }

  static async registrar(data: AsistenciaDTO) {
    const alumno = await AsistenciasRepository.findAlumno(data.alumnoId);
    if (!alumno) throw ApiError.notFound("Alumno no encontrado");
    if (alumno.estado === "inactivo") throw ApiError.badRequest("El alumno está inactivo.");

    const fechaHora = data.fechaHora ?? new Date().toISOString();
    try {
      return await AsistenciasRepository.create({
        alumno_id: alumno.id,
        categoria_id: alumno.categoria_id ?? null,
        fecha: fechaLima(fechaHora),
        fecha_hora: fechaHora,
        metodo: data.metodo,
      });
    } catch (error) {
      if (esDuplicado(error)) throw ApiError.conflict(DUPLICADO);
      throw error;
    }
  }

  static async corregir(id: string, data: ActualizarAsistenciaDTO) {
    let actualizada;
    try {
      actualizada = await AsistenciasRepository.update(id, {
        fecha: fechaLima(data.fechaHora),
        fecha_hora: data.fechaHora,
        metodo: data.metodo,
      });
    } catch (error) {
      if (esDuplicado(error)) throw ApiError.conflict(DUPLICADO);
      throw error;
    }
    if (!actualizada) throw ApiError.notFound("No se encontró el registro de asistencia.");
    return actualizada;
  }
}
