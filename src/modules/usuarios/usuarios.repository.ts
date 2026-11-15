import { supabaseAdmin } from '../../config/supabase';

const TABLE = 'usuarios';

export async function obtenerAlumnoPorId(alumnoId: string) {
  const { data, error } = await supabaseAdmin.from('alumnos')
    .select('id,nombres,apellidos,email').eq('id', alumnoId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function alumnoTieneUsuario(alumnoId: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('id')
    .eq('estudiante_id', alumnoId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function usuarioExiste(usuario: string) {
  const { data, error } = await supabaseAdmin.from(TABLE).select('id')
    .ilike('usuario', usuario.replace(/[\\%_]/g, '\\$&')).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function crearCuentaAuth(email: string, password: string, nombre: string) {
  return supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol: 'ALU' },
  });
}

export async function insertarUsuario(usuario: {
  id: string;
  usuario: string;
  email: string;
  nombre: string;
  estudianteId: string;
}) {
  const { error } = await supabaseAdmin.rpc('crear_cuenta_alumno', {
    p_auth_id: usuario.id,
    p_alumno_id: usuario.estudianteId,
    p_usuario: usuario.usuario,
    p_email: usuario.email,
  });
  if (error) throw error;
}

export async function eliminarCuentaAuth(id: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) throw error;
}

export async function actualizarEstado(usuarioId: string, activo: boolean) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .update({ activo })
    .eq('id', usuarioId)
    .select('id,usuario,nombre,rol,activo')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function obtenerUsuarioPorId(usuarioId: string) {
  const { data } = await supabaseAdmin.from(TABLE).select('*').eq('id', usuarioId).maybeSingle();
  return data;
}

export async function resetearPassword(usuarioId: string, nuevaPassword: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(usuarioId, { password: nuevaPassword });
  if (error) throw error;
}

// ---------- USR-04 / categorías de la sesión ----------

/** Todas las cuentas del sistema (admin, profesores y alumnos). */
export async function listarUsuarios() {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id,usuario,email,nombre,rol,activo,created_at,estudiante_id,profesor_id')
    .order('nombre');
  if (error) throw error;
  return data ?? [];
}

type FilaConCategoria = { categorias: { nombre: string } | { nombre: string }[] | null };

function nombreCategoria(fila: FilaConCategoria) {
  const categoria = Array.isArray(fila.categorias) ? fila.categorias[0] : fila.categorias;
  return categoria?.nombre ?? null;
}

/** alumnoId → nombre de su categoría. */
export async function categoriasDeAlumnos(alumnoIds: string[]) {
  const mapa = new Map<string, string>();
  if (alumnoIds.length === 0) return mapa;
  const { data, error } = await supabaseAdmin.from('alumnos').select('id, categorias(nombre)').in('id', alumnoIds);
  if (error) throw error;
  for (const fila of (data ?? []) as unknown as (FilaConCategoria & { id: string })[]) {
    const nombre = nombreCategoria(fila);
    if (nombre) mapa.set(fila.id, nombre);
  }
  return mapa;
}

/** profesorId → nombres de las categorías que tiene asignadas. */
export async function categoriasDeProfesores(profesorIds: string[]) {
  const mapa = new Map<string, string[]>();
  if (profesorIds.length === 0) return mapa;
  const { data, error } = await supabaseAdmin
    .from('profesores_categorias')
    .select('profesor_id, categorias(nombre)')
    .in('profesor_id', profesorIds);
  if (error) throw error;
  for (const fila of (data ?? []) as unknown as (FilaConCategoria & { profesor_id: string })[]) {
    const nombre = nombreCategoria(fila);
    if (!nombre) continue;
    mapa.set(fila.profesor_id, [...(mapa.get(fila.profesor_id) ?? []), nombre]);
  }
  for (const nombres of mapa.values()) nombres.sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  return mapa;
}

/** id → último ingreso y métodos de acceso (contraseña, Google) según Supabase Auth. */
export async function datosDeAcceso() {
  const mapa = new Map<string, { ultimoAcceso: string | null; proveedores: string[] }>();
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  for (const usuario of data.users) {
    const proveedores = (usuario.app_metadata?.providers as string[] | undefined) ?? (usuario.app_metadata?.provider ? [usuario.app_metadata.provider as string] : []);
    mapa.set(usuario.id, { ultimoAcceso: usuario.last_sign_in_at ?? null, proveedores });
  }
  return mapa;
}
