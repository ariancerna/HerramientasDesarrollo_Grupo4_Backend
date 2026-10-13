import { ApiError } from '../../lib/errors/api-error';
import * as repository from './profesores.repository';
import { CambiosProfesor, NuevoProfesor } from './profesores.schema';
function databaseError(error: any): never {
  if (error?.code === '23505') throw ApiError.conflict('El usuario o correo ya esta registrado');
  if (error?.code === '23503') throw ApiError.badRequest('La sede o alguna categoria no existe');
  if (error?.code === 'P0002') throw ApiError.notFound('Profesor o cuenta no encontrados');
  throw error;
}
export async function list(filters: Record<string, unknown>) { return repository.findAll(filters); }
export async function getById(id: string) {
  const profesor = await repository.findById(id);
  if (!profesor) throw ApiError.notFound('Profesor no encontrado');
  return profesor;
}
export async function create(body: NuevoProfesor) {
  if (!await repository.sedeExiste(body.sedeId)) throw ApiError.badRequest('La sede no existe');
  if (await repository.usuarioExiste(body.usuario)) throw ApiError.conflict('El usuario ya esta registrado');
  const { data, error } = await repository.crearAuth(body);
  if (error || !data.user) {
    if (error?.code === 'email_exists' || error?.code === 'email_address_exists') throw ApiError.conflict('El correo ya esta registrado');
    throw ApiError.badRequest('No se pudo crear la cuenta del profesor');
  }
  const id = data.user.id;
  try { return await repository.create(id, body); }
  catch (dbError) {
    try { await repository.eliminarAuth(id); }
    catch { throw new ApiError(500, 'AUTH_CLEANUP_REQUIRED', 'No se pudo revertir la cuenta de Auth; requiere limpieza administrativa', { authUserId: id }); }
    return databaseError(dbError);
  }
}
export async function update(id: string, body: CambiosProfesor) {
  if (body.usuario !== undefined) {
    await getById(id);
    if (await repository.usuarioExiste(body.usuario, id)) {
      throw ApiError.conflict('El usuario ya esta registrado');
    }
  }
  try { return await repository.update(id, body); } catch (error) { return databaseError(error); }
}
export async function asignarCategorias(id: string, ids: string[]) {
  try { return await repository.asignarCategorias(id, ids); } catch (error) { return databaseError(error); }
}
export async function remove(id: string) {
  let removed;
  try { removed = await repository.remove(id); }
  catch (error: any) {
    if (error?.code === '23503') throw ApiError.conflict('El profesor tiene evaluaciones, anuncios u otros registros asociados');
    throw error;
  }
  if (!removed) throw ApiError.notFound('Profesor no encontrado');
  try {
    await repository.eliminarAuth(id);
    await repository.completarEliminacion(id);
  } catch {
    throw ApiError.internal('El perfil fue eliminado; reintenta DELETE para completar la limpieza de Auth');
  }
}
