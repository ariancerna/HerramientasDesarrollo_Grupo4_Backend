import * as repository from './configuracion.repository';
import type { CambiosMiConfiguracion } from './configuracion.schema';

export async function obtenerMiConfig(usuarioId: string) {
  return repository.obtenerMiConfig(usuarioId);
}
export async function actualizarMiConfig(usuarioId: string, cambios: CambiosMiConfiguracion) {
  return repository.actualizarMiConfig(usuarioId, cambios);
}
export const obtenerConfigClub = repository.obtenerConfigClub;
export const actualizarConfigClub = repository.actualizarConfigClub;
