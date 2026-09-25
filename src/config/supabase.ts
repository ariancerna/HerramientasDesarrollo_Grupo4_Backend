import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Cliente ADMIN (service_role): se usa SOLO desde el backend (repositories).
 * Se salta las políticas RLS, así que nunca debe exponerse al front.
 */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Cliente con la anon key: se usa para operaciones de Auth que representan
 * al usuario final (login, refresh, recuperar contraseña) respetando RLS.
 */
export const supabaseAnon = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
