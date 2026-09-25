import * as repository from './usuarios.repository';

export async function crearCuentaParaAlumno(estudianteId: string, usuario: string, password: string) {
  return repository.crearCuentaParaAlumno(estudianteId, usuario, password);
}

export async function actualizarEstado(usuarioId: string, activo: boolean) {
  return repository.actualizarEstado(usuarioId, activo);
}

export async function resetearPassword(usuarioId: string, nuevaPassword: string) {
  return repository.resetearPassword(usuarioId, nuevaPassword);
}
