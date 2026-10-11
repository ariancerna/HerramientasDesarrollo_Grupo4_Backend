import { ApiError } from '../../lib/errors/api-error';
import { horariosRepository } from './horarios.repository';

export function crearHorariosService(repository = horariosRepository) {
  return {
    async eliminar(categoriaId: string, horarioId: string): Promise<void> {
      if (!await repository.categoriaExiste(categoriaId)) {
        throw ApiError.notFound('Categoría no encontrada');
      }
      if (!await repository.eliminar(categoriaId, horarioId)) {
        throw ApiError.notFound('Horario no encontrado en esta categoría');
      }
    },
  };
}

export const horariosService = crearHorariosService();
