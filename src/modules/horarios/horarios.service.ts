import { ApiError } from '../../lib/errors/api-error';
import { horariosRepository } from './horarios.repository';
import type { ActualizarHorarioInput } from './horarios.schema';
import type { HorarioChanges, HorarioDto, HorarioRow } from './horarios.types';

function segundos(hora: string): number {
  const [horas, minutos, segundos = 0] = hora.split(':').map(Number);
  return horas * 3600 + minutos * 60 + segundos;
}

function toDto(row: HorarioRow): HorarioDto {
  return {
    id: row.id, categoriaId: row.categoria_id, dia: row.dia,
    // Se omiten solo segundos cero; nunca se truncan segundos significativos.
    horaInicio: row.hora_inicio.replace(/:00$/, ''),
    horaFin: row.hora_fin.replace(/:00$/, ''),
    cancha: row.cancha, estado: row.estado, createdAt: row.created_at,
  };
}

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

    async actualizar(categoriaId: string, horarioId: string, payload: ActualizarHorarioInput): Promise<HorarioDto> {
      if (!await repository.categoriaExiste(categoriaId)) {
        throw ApiError.notFound('Categoría no encontrada');
      }
      const actual = await repository.buscar(categoriaId, horarioId);
      if (!actual) throw ApiError.notFound('Horario no encontrado en esta categoría');

      const inicio = payload.horaInicio ?? actual.hora_inicio;
      const fin = payload.horaFin ?? actual.hora_fin;
      if (segundos(fin) <= segundos(inicio)) {
        throw ApiError.badRequest('La hora final debe ser mayor a la hora inicial');
      }

      // Lista explícita: no se permite cambiar id, categoría ni fecha de creación.
      const changes: HorarioChanges = {};
      if (payload.dia !== undefined) changes.dia = payload.dia;
      if (payload.horaInicio !== undefined) changes.hora_inicio = payload.horaInicio;
      if (payload.horaFin !== undefined) changes.hora_fin = payload.horaFin;
      if (payload.cancha !== undefined) changes.cancha = payload.cancha;
      if (payload.estado !== undefined) changes.estado = payload.estado;
      const actualizado = await repository.actualizar(categoriaId, horarioId, changes);
      if (!actualizado) throw ApiError.notFound('Horario no encontrado en esta categoría');
      return toDto(actualizado);
    },
  };
}

export const horariosService = crearHorariosService();
