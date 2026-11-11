import { crearClienteAuthAislado, supabaseAdmin, supabaseAnon } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';

function passwordError(error: { code?: string; status?: number }, verificar = false): never {
  if (error.status === 429 || error.code === 'over_request_rate_limit') {
    throw new ApiError(429, 'TOO_MANY_REQUESTS', 'Demasiados intentos; vuelve a intentarlo más tarde');
  }
  if (verificar && error.code === 'invalid_credentials') {
    throw ApiError.unauthorized('La contraseña actual no es correcta');
  }
  if (['weak_password', 'same_password'].includes(error.code ?? '')) {
    throw ApiError.badRequest('La nueva contraseña no cumple la política de seguridad');
  }
  throw ApiError.internal('No se pudo actualizar la contraseña');
}

/** AUTH-10: una sesión temporal por petición, nunca modifica el cliente compartido. */
export async function cambiarPasswordPropia(email: string, id: string, actual: string, nueva: string) {
  const client = crearClienteAuthAislado();
  let sesionCreada = false;
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password: actual });
    if (error) passwordError(error, true);
    sesionCreada = Boolean(data.session);
    if (!data.session || data.user?.id !== id) {
      throw ApiError.unauthorized('No se pudo verificar la identidad de la cuenta');
    }
    // Actualización como usuario autenticado, no con privilegios de service_role.
    const result = await client.auth.updateUser({ password: nueva });
    if (result.error) passwordError(result.error);
    if (result.data.user?.id !== id) throw ApiError.internal('No se pudo confirmar la actualización');
  } finally {
    if (sesionCreada) {
      try {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) throw error;
      } catch {
        // No registrar tokens/contraseñas ni ocultar el resultado original del cambio.
        console.error('No se pudo cerrar la sesión temporal de cambio de contraseña');
      }
    }
  }
}

/**
 * AUTH-01: login. El front manda "usuario", pero Supabase Auth trabaja con
 * email → hay que resolver usuario -> email antes de llamar signInWithPassword.
 * (Ver decisión pendiente #1 en docs/ENDPOINTS.md)
 */
export async function findCuentaByUsuario(usuario: string) {
  // Los usuarios son únicos sin distinguir mayúsculas (índice usuarios_nombre_sin_mayusculas).
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id,usuario,email,nombre,rol,estudiante_id,activo')
    .ilike('usuario', usuario.trim().replace(/[\\%_]/g, '\\$&'))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; usuario: string; email: string; nombre: string; rol: string;
    estudiante_id: string | null; activo: boolean } | null;
}

export async function revocarSesion(accessToken: string) {
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
  if (error && error.status !== 401 && error.status !== 404) throw error;
}

export async function signInWithPassword(email: string, password: string) {
  return supabaseAnon.auth.signInWithPassword({ email, password });
}

export async function refreshSession(refreshToken: string) {
  return supabaseAnon.auth.refreshSession({ refresh_token: refreshToken });
}

export async function usuarioExiste(usuario: string, excluirId?: string) {
  let query = supabaseAdmin.from('usuarios').select('id')
    .ilike('usuario', usuario.replace(/[\\%_]/g, '\\$&'));
  if (excluirId) query = query.neq('id', excluirId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

// ---------- AUTH-05: registro por DNI ----------

export async function findAlumnoByDni(dni: string) {
  const { data, error } = await supabaseAdmin.from('alumnos').select('*').eq('dni', dni).maybeSingle();
  if (error) throw error;
  return data;
}


// ---------- AUTH-07/08/09: recuperar contraseña ----------

export async function guardarCodigoRecuperacion(correo: string, codigo: string) {
  const expiraEn = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
  const { error } = await supabaseAdmin
    .from('codigos_recuperacion')
    .insert({ correo, codigo, expira_en: expiraEn });
  if (error) throw error;
}

export async function codigoReciente(correo: string, segundos: number) {
  const { data, error } = await supabaseAdmin.from('codigos_recuperacion').select('id')
    .eq('correo', correo).eq('usado', false)
    .gte('created_at', new Date(Date.now() - segundos * 1000).toISOString()).limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** AUTH-08 atómico en SQL (verificar_codigo_recuperacion): 'ok' | 'invalido' | 'bloqueado'. */
export async function verificarCodigo(correo: string, codigo: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('verificar_codigo_recuperacion', { p_correo: correo, p_codigo: codigo });
  if (error) throw error;
  return data as string;
}

/** Un código nuevo anula los anteriores: así el límite de intentos no se multiplica. */
export async function invalidarCodigos(correo: string) {
  const { error } = await supabaseAdmin.from('codigos_recuperacion').update({ usado: true })
    .eq('correo', correo).eq('usado', false);
  if (error) throw error;
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

// ---------- Recuperación con el correo de Supabase Auth (SMTP del proyecto, p. ej. Gmail) ----------

/**
 * Pide a Supabase que envíe el correo "Reset Password" del proyecto. La plantilla
 * debe incluir {{ .Token }} para que el usuario reciba el código de 6 dígitos.
 */
export async function enviarCodigoSupabase(email: string) {
  const { error } = await crearClienteAuthAislado().auth.resetPasswordForEmail(email);
  if (!error) return;
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
    throw new ApiError(429, 'TOO_MANY_REQUESTS', 'Ya te enviamos un código hace poco. Espera un minuto antes de pedir otro.');
  }
  console.error('Supabase no pudo enviar el correo de recuperación', { status: error.status, code: error.code, message: error.message });
  throw new ApiError(502, 'CORREO_NO_ENVIADO', 'No se pudo enviar el correo. Revisa la configuración SMTP de Supabase o intenta más tarde.');
}

/** Verifica el código de recuperación de Supabase: 'ok' | 'invalido' | 'bloqueado'. */
export async function verificarCodigoSupabase(email: string, codigo: string): Promise<'ok' | 'invalido' | 'bloqueado'> {
  const { data, error } = await crearClienteAuthAislado().auth.verifyOtp({ email, token: codigo, type: 'recovery' });
  if (error) return error.status === 429 ? 'bloqueado' : 'invalido';
  // verifyOtp abre una sesión que no se usa: el cambio se hace con nuestro resetToken.
  if (data.session) {
    try {
      await supabaseAdmin.auth.admin.signOut(data.session.access_token);
    } catch {
      console.error('No se pudo cerrar la sesión temporal de recuperación');
    }
  }
  return 'ok';
}

/** Búsqueda sin distinguir mayúsculas: "Ana@Gmail.com" y "ana@gmail.com" son la misma cuenta. */
export async function obtenerUsuarioPorEmail(email: string) {
  const patron = email.trim().replace(/[\\%_]/g, '\\$&');
  const { data, error } = await supabaseAdmin.from('usuarios').select('*').ilike('email', patron).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function actualizarPasswordAuth(usuarioId: string, nuevaPassword: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(usuarioId, { password: nuevaPassword });
  if (error) throw error;
}

const EXTENSIONES_FOTO: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * Foto de perfil de cualquier cuenta: se guarda en el bucket "avatares" y su URL
 * en los metadatos de Auth, así no requiere columnas nuevas en la base de datos.
 */
export async function guardarFotoPerfil(usuarioId: string, file: Express.Multer.File) {
  const extension = EXTENSIONES_FOTO[file.mimetype];
  if (!extension) throw ApiError.badRequest('Solo se admiten imágenes JPEG, PNG o WebP');
  const path = `usuarios/${usuarioId}/foto.${extension}`;

  const { error } = await supabaseAdmin.storage.from('avatares').upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: true,
  });
  if (error) throw error;

  // El parámetro de versión evita que el navegador muestre la foto anterior en caché.
  const { data } = supabaseAdmin.storage.from('avatares').getPublicUrl(path);
  const fotoUrl = `${data.publicUrl}?v=${Date.now()}`;
  const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(usuarioId, {
    user_metadata: { avatar_url: fotoUrl },
  });
  if (metaError) throw metaError;
  return fotoUrl;
}

export async function quitarFotoPerfil(usuarioId: string) {
  const { error } = await supabaseAdmin.storage.from('avatares').remove(
    Object.values(EXTENSIONES_FOTO).map((extension) => `usuarios/${usuarioId}/foto.${extension}`),
  );
  if (error) throw error;
  const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(usuarioId, {
    user_metadata: { avatar_url: null },
  });
  if (metaError) throw metaError;
}
