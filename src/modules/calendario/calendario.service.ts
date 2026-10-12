import { CalendarioRepository } from "./calendario.repository";
import { CalendarioDTO } from "./calendario.schema";

export class CalendarioService {
  static async obtenerTodos() {
    return await CalendarioRepository.findAll();
  }

  static async obtenerPorId(id: string) {
    return await CalendarioRepository.findById(id);
  }

  static async registrar(data: CalendarioDTO) {
    return await CalendarioRepository.create(data);
  }
}
