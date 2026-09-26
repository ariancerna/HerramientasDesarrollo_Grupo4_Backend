import { supabaseAdmin, supabaseAnon } from '../../config/supabase';

/**
 * AUTH-01: login. El front manda "usuario", pero Supabase Auth trabaja con
 * email → hay que resolver usuario -> email antes de llamar signInWithPassword.
 * (Ver decisión pendiente #1 en docs/ENDPOINTS.md)
 */
export async function findEmailByUsuario(usuario: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('email')
    .eq('usuario', usuario)
    .single();
  if (error) return null;
  return data?.email ?? null;
}

export async function signInWithPassword(email: string, password: string) {
  return supabaseAnon.auth.signInWithPassword({ email, password });
}

export async function refreshSession(refreshToken: string) {
  return supabaseAnon.auth.refreshSession({ refresh_token: refreshToken });
}

export async function usuarioExiste(usuario: string, excluirId?: string) {
  let query = supabaseAdmin.from('usuarios').select('id').eq('usuario', usuario);
  if (excluirId) query = query.neq('id', excluirId);
  const { data } = await query.maybeSingle();
  return Boolean(data);
}

// ---------- AUTH-05: registro por DNI ----------

export async function findAlumnoByDni(dni: string) {
  const { data } = await supabaseAdmin.from('alumnos').select('*').eq('dni', dni).maybeSingle();
  return data;
}

export async function alumnoTieneUsuario(alumnoId: string) {
  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('id')
    .eq('estudiante_id', alumnoId)
    .maybeSingle();
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
  rol: 'ADM' | 'PROF' | 'ALU';
  estudianteId?: string;
}) {
  const { error } = await supabaseAdmin.from('usuarios').insert({
    id: usuario.id,
    usuario: usuario.usuario,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    estudiante_id: usuario.estudianteId ?? null,
  });
  if (error) throw error;
}

// ---------- AUTH-07/08/09: recuperar contraseña ----------

export async function guardarCodigoRecuperacion(correo: string, codigo: string) {
  const expiraEn = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
  const { error } = await supabaseAdmin
    .from('codigos_recuperacion')
    .insert({ correo, codigo, expira_en: expiraEn });
  if (error) throw error;
}

export async function obtenerCodigoVigente(correo: string, codigo: string) {
  const { data } = await supabaseAdmin
    .from('codigos_recuperacion')
    .select('*')
    .eq('correo', correo)
    .eq('codigo', codigo)
    .eq('usado', false)
    .gte('expira_en', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function marcarCodigoUsado(id: string) {
  await supabaseAdmin.from('codigos_recuperacion').update({ usado: true }).eq('id', id);
}

export async function guardarResetToken(correo: string): Promise<string> {
  const expiraEn = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
  const { data, error } = await supabaseAdmin
    .from('password_reset_tokens')
    .insert({ correo, expira_en: expiraEn })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function obtenerResetTokenVigente(resetToken: string) {
  const { data } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('*')
    .eq('id', resetToken)
    .eq('usado', false)
    .gte('expira_en', new Date().toISOString())
    .maybeSingle();
  return data;
}

export async function marcarResetTokenUsado(id: string) {
  await supabaseAdmin.from('password_reset_tokens').update({ usado: true }).eq('id', id);
}

export async function obtenerUsuarioPorEmail(email: string) {
  const { data } = await supabaseAdmin.from('usuarios').select('*').eq('email', email).maybeSingle();
  return data;
}

export async function actualizarPasswordAuth(usuarioId: string, nuevaPassword: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(usuarioId, { password: nuevaPassword });
  if (error) throw error;
}