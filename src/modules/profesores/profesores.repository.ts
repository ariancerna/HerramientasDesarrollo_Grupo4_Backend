import { supabaseAdmin } from '../../config/supabase';
import { CambiosProfesor, NuevoProfesor } from './profesores.schema';
const SELECT = '*, usuarios(usuario,email,rol), profesores_categorias(categoria_id)';
export function presentProfesor(row: any) {
  const cuenta = (row.usuarios ?? []).find((user: any) => user.rol === 'PROF');
  return { id: row.id, nombre: row.nombre, sedeId: row.sede_id, usuario: cuenta?.usuario ?? null, email: cuenta?.email ?? null,
    categoriaIds: (row.profesores_categorias ?? []).map((item: any) => item.categoria_id) };
}
export async function findAll(filters: Record<string, unknown> = {}) {
  let query = supabaseAdmin.from('profesores').select(SELECT).order('nombre').order('id');
  if (typeof filters.texto === 'string' && filters.texto) query = query.ilike('nombre', `%${filters.texto.replace(/[\\%_]/g, '\\$&')}%`);
  if (filters.sedeId) query = query.eq('sede_id', filters.sedeId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(presentProfesor);
}
export async function findById(id: string) {
  const { data, error } = await supabaseAdmin.from('profesores').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? presentProfesor(data) : null;
}
export async function usuarioExiste(usuario: string) {
  const { data, error } = await supabaseAdmin.from('usuarios').select('id').ilike('usuario', usuario.replace(/[\\%_]/g, '\\$&')).limit(1).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
export async function sedeExiste(id: string) {
  const { data, error } = await supabaseAdmin.from('sedes').select('id').eq('id', id).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
export async function crearAuth(body: NuevoProfesor) {
  return supabaseAdmin.auth.admin.createUser({ email: body.email, password: body.password, email_confirm: true,
    user_metadata: { nombre: body.nombre }, app_metadata: { rol: 'PROF' } });
}
export async function eliminarAuth(id: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error && error.status !== 404 && error.code !== 'user_not_found') throw error;
}
async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.rpc(name, args);
  if (error) throw error;
  return data;
}
export async function create(id: string, body: NuevoProfesor) {
  return rpc('crear_profesor', { p_id: id, p_nombre: body.nombre, p_usuario: body.usuario, p_email: body.email, p_sede_id: body.sedeId, p_categoria_ids: body.categoriaIds });
}
export async function update(id: string, body: CambiosProfesor) {
  return rpc('actualizar_profesor', { p_id: id, p_cambios: body });
}
export async function asignarCategorias(id: string, ids: string[]) {
  return rpc('asignar_categorias_profesor', { p_id: id, p_categoria_ids: ids });
}
export async function remove(id: string): Promise<boolean> { return rpc('eliminar_profesor', { p_id: id }); }
export async function completarEliminacion(id: string) {
  const { error } = await supabaseAdmin.from('profesores_auth_pendientes').delete().eq('profesor_id', id);
  if (error) throw error;
}
