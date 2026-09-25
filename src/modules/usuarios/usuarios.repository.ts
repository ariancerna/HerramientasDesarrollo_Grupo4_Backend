import { supabaseAdmin } from '../../config/supabase';

const TABLE = 'usuarios';

export async function crearCuentaParaAlumno(estudianteId: string, usuario: string, password: string) {
  // TODO: 1) crear el usuario en Supabase Auth (supabaseAdmin.auth.admin.createUser)
  //       2) insertar la fila en la tabla `usuarios` con rol ALU y estudianteId
  throw new Error('Not implemented');
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
  // TODO: supabaseAdmin.auth.admin.updateUserById(usuarioId, { password: nuevaPassword })
  throw new Error('Not implemented');
}
