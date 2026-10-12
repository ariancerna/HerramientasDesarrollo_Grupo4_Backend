import { AsistenciasRepository } from './asistencias.repository';
import { AsistenciaDTO } from './asistencias.schema';

export class AsistenciasService {
  static async obtenerTodas() {
    return await AsistenciasRepository.findAll();
  }

  static async obtenerPorAlumno(alumno_id: string) {
    return await AsistenciasRepository.findByAlumno(alumno_id);
  }

  static async registrar(data: AsistenciaDTO) {
    return await AsistenciasRepository.create(data);
  }
}