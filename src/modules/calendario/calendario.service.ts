import { ApiError } from "../../lib/errors/api-error";
import { CalendarioRepository } from "./calendario.repository";
import { ActualizarCalendarioDTO, CalendarioDTO } from "./calendario.schema";

function validarHoras(horaInicio?: string, horaFin?: string | null) {
  if (horaInicio && horaFin && horaFin <= horaInicio) {
    throw ApiError.badRequest("La hora de fin debe ser posterior a la hora de inicio.");
  }
}

export class CalendarioService {
  static async obtenerTodos() {
    return await CalendarioRepository.findAll();
  }

  static async obtenerPorId(id: string) {
    const evento = await CalendarioRepository.findById(id);
    if (!evento) throw ApiError.notFound("Evento no encontrado");
    return evento;
  }

  static async registrar(data: CalendarioDTO) {
    validarHoras(data.horaInicio, data.horaFin);
    return await CalendarioRepository.create(data);
  }

  static async actualizar(id: string, data: ActualizarCalendarioDTO) {
    const actual = await CalendarioService.obtenerPorId(id);
    validarHoras(data.horaInicio ?? actual.horaInicio, data.horaFin === undefined ? actual.horaFin : data.horaFin);
    const actualizado = await CalendarioRepository.update(id, data);
    if (!actualizado) throw ApiError.notFound("Evento no encontrado");
    return actualizado;
  }

  static async eliminar(id: string) {
    const eliminado = await CalendarioRepository.remove(id);
    if (!eliminado) throw ApiError.notFound("Evento no encontrado");
  }
}
