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
    .select()
    .single();
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
