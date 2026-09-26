import { supabaseAdmin } from '../../config/supabase';

const TABLE = 'usuarios';

export async function obtenerAlumnoPorId(alumnoId: string) {
  const { data } = await supabaseAdmin.from('alumnos').select('*').eq('id', alumnoId).maybeSingle();
  return data;
}

export async function alumnoTieneUsuario(alumnoId: string) {
  const { data } = await supabaseAdmin
    .from(TABLE)
    .select('id')
    .eq('estudiante_id', alumnoId)
    .maybeSingle();
  return Boolean(data);
}

export async function usuarioExiste(usuario: string) {
  const { data } = await supabaseAdmin.from(TABLE).select('id').eq('usuario', usuario).maybeSingle();
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
  const { error } = await supabaseAdmin.from(TABLE).insert({
    id: usuario.id,
    usuario: usuario.usuario,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: 'ALU',
    estudiante_id: usuario.estudianteId,
  });
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

export async function resetearPassword(usuarioId: string, nuevaPassword: string) {
  // TODO (USR-03, siguiente commit): supabaseAdmin.auth.admin.updateUserById(...)
  throw new Error('Not implemented');
}