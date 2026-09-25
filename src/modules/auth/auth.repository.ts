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

export async function signOut(accessToken: string) {
  return supabaseAnon.auth.admin ? null : supabaseAnon.auth.signOut();
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
