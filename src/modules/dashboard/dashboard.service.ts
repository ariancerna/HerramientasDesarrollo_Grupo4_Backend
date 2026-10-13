import { ApiError } from '../../lib/errors/api-error';
import type { AuthUser } from '../../types/express';
import { dashboardRepository } from './dashboard.repository';
import { contextoDashboard } from './dashboard.utils';

export function crearDashboardService(repository = dashboardRepository, reloj = () => new Date()) {
  return {
    resumenAdmin() {
      return repository.resumenAdmin(contextoDashboard(reloj()));
    },
    resumenProfesor(usuario: AuthUser) {
      // El esquema permite que profesores.id sea el mismo UUID de Auth.
      return repository.resumenProfesor(usuario.profesorId ?? usuario.id, contextoDashboard(reloj()));
    },
    resumenAlumno(usuario: AuthUser) {
      if (!usuario.estudianteId) {
        throw ApiError.forbidden('Tu cuenta no tiene un alumno vinculado. Contacta a un administrador.');
      }
      return repository.resumenAlumno(usuario.estudianteId, contextoDashboard(reloj()));
    },
  };
}

export const { resumenAdmin, resumenProfesor, resumenAlumno } = crearDashboardService();
