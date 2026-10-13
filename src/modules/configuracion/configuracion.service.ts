import * as repository from './configuracion.repository';

export async function obtenerMiConfig(usuarioId: string) {
  return repository.obtenerMiConfig(usuarioId);
}
export const actualizarMiConfig = repository.actualizarMiConfig;
export const obtenerConfigClub = repository.obtenerConfigClub;
export const actualizarConfigClub = repository.actualizarConfigClub;
