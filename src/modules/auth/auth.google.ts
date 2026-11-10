import { env } from '../../config/env';
import { supabaseAdmin, supabaseAnon } from '../../config/supabase';
import { ApiError } from '../../lib/errors/api-error';
import * as usuariosRepository from '../usuarios/usuarios.repository';

/**
 * AUTH-12 / AUTH-13 — Inicio de sesión con Google (Supabase Auth, proveedor Google).
 *
 * 1. El front pide la URL de autorización y redirige al usuario a Google.
 * 2. Google vuelve a Supabase y Supabase al front (/auth/callback) con los tokens.
 * 3. El front envía los tokens aquí y el backend decide a qué cuenta del club
 *    corresponde ese correo de Google:
 *    - Si ya tiene cuenta con ese correo, Supabase vincula Google a la misma
 *      cuenta (mismo id) y entra con su rol de siempre.
 *    - Si es un alumno inscrito con ese correo pero sin cuenta, se le crea.
 *    - Si el correo no pertenece al club, se elimina el usuario que Supabase
 *      creó automáticamente y se rechaza el acceso.
 */

interface UsuarioAuthGoogle {
  id: string;
  email?: string | null;
}

interface CuentaClub {
  id: string;
  usuario: string;
  email: string;
  nombre: string;
  rol: string;
  estudiante_id: string | null;
  activo: boolean;
}

interface AlumnoSinCuenta {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
}

export interface GoogleDeps {
  obtenerUsuarioAuth(accessToken: string): Promise<UsuarioAuthGoogle | null>;
  buscarCuentaPorId(id: string): Promise<CuentaClub | null>;
  buscarCuentaPorEmail(email: string): Promise<CuentaClub | null>;
  buscarAlumnoSinCuentaPorEmail(email: string): Promise<AlumnoSinCuenta | null>;
  usuarioExiste(usuario: string): Promise<boolean>;
  crearCuentaAlumno(datos: { id: string; usuario: string; email: string; nombre: string; estudianteId: string }): Promise<void>;
  eliminarUsuarioAuth(id: string): Promise<void>;
  revocarSesion(accessToken: string): Promise<void>;
}

const COLUMNAS_CUENTA = 'id,usuario,email,nombre,rol,estudiante_id,activo';

function escaparIlike(valor: string) {
  return valor.trim().replace(/[\\%_]/g, '\\$&');
}

const depsSupabase: GoogleDeps = {
  async obtenerUsuarioAuth(accessToken) {
    const { data, error } = await supabaseAnon.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email };
  },
  async buscarCuentaPorId(id) {
    const { data, error } = await supabaseAdmin.from('usuarios').select(COLUMNAS_CUENTA).eq('id', id).maybeSingle();
    if (error) throw error;
    return data as CuentaClub | null;
  },
  async buscarCuentaPorEmail(email) {
    const { data, error } = await supabaseAdmin.from('usuarios').select(COLUMNAS_CUENTA)
      .ilike('email', escaparIlike(email)).limit(1).maybeSingle();
    if (error) throw error;
    return data as CuentaClub | null;
  },
  async buscarAlumnoSinCuentaPorEmail(email) {
    const { data, error } = await supabaseAdmin.from('alumnos').select('id,nombres,apellidos,email,estado')
      .ilike('email', escaparIlike(email)).eq('estado', 'activo').limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (await usuariosRepository.alumnoTieneUsuario(data.id)) return null;
    return data as AlumnoSinCuenta;
  },
  usuarioExiste: (usuario) => usuariosRepository.usuarioExiste(usuario),
  crearCuentaAlumno: (datos) => usuariosRepository.insertarUsuario(datos),
  eliminarUsuarioAuth: (id) => usuariosRepository.eliminarCuentaAuth(id),
  async revocarSesion(accessToken) {
    const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
    if (error && error.status !== 401 && error.status !== 404) throw error;
  },
};

/** URL de Supabase que inicia el flujo de Google y vuelve a `redirectTo`. */
export function urlAutorizacionGoogle(redirectTo: string, supabaseUrl = env.supabaseUrl) {
  const url = new URL('/auth/v1/authorize', supabaseUrl);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', redirectTo);
  url.searchParams.set('prompt', 'select_account');
  return { url: url.toString() };
}

export function crearLoginGoogle(deps: GoogleDeps = depsSupabase) {
  /** Usuario libre a partir del correo: "ana.torres@gmail.com" → "ana.torres", "ana.torres2"... */
  async function usuarioDisponibleDesde(email: string) {
    const base = (email.split('@')[0] ?? 'alumno').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'alumno';
    const semilla = base.length >= 3 ? base : `${base}alumno`;
    for (let intento = 0; intento < 50; intento += 1) {
      const candidato = intento === 0 ? semilla : `${semilla}${intento + 1}`;
      if (!await deps.usuarioExiste(candidato)) return candidato;
    }
    return `${semilla}${Date.now().toString(36)}`;
  }

  async function rechazar(usuarioAuthId: string, error: ApiError): Promise<never> {
    // Solo se borra el usuario que Supabase creó al entrar con Google; nunca una cuenta del club.
    try { await deps.eliminarUsuarioAuth(usuarioAuthId); } catch { /* limpieza best-effort */ }
    throw error;
  }

  async function resolverCuenta(usuarioAuth: UsuarioAuthGoogle): Promise<CuentaClub> {
    const vinculada = await deps.buscarCuentaPorId(usuarioAuth.id);
    if (vinculada) return vinculada;

    const email = usuarioAuth.email?.trim();
    if (!email) {
      return rechazar(usuarioAuth.id, ApiError.badRequest('Tu cuenta de Google no tiene un correo disponible.'));
    }

    const conMismoCorreo = await deps.buscarCuentaPorEmail(email);
    if (conMismoCorreo) {
      return rechazar(usuarioAuth.id, ApiError.conflict(
        'Ya existe una cuenta del club con este correo. Ingresa con tu usuario y contraseña.',
      ));
    }

    const alumno = await deps.buscarAlumnoSinCuentaPorEmail(email);
    if (!alumno) {
      return rechazar(usuarioAuth.id, ApiError.forbidden(
        'Tu correo de Google no está registrado en el club. Pide a un administrador que lo agregue a tu ficha.',
      ));
    }

    const nombre = `${alumno.nombres} ${alumno.apellidos}`;
    const usuario = await usuarioDisponibleDesde(email);
    try {
      await deps.crearCuentaAlumno({ id: usuarioAuth.id, usuario, email: alumno.email, nombre, estudianteId: alumno.id });
    } catch {
      return rechazar(usuarioAuth.id, ApiError.conflict('No se pudo crear tu cuenta con Google. Intenta nuevamente.'));
    }
    return { id: usuarioAuth.id, usuario, email: alumno.email, nombre, rol: 'ALU', estudiante_id: alumno.id, activo: true };
  }

  async function login(accessToken: string, refreshToken: string) {
    const usuarioAuth = await deps.obtenerUsuarioAuth(accessToken);
    if (!usuarioAuth) throw ApiError.unauthorized('La sesión de Google no es válida o expiró. Intenta nuevamente.');

    const cuenta = await resolverCuenta(usuarioAuth);
    if (!cuenta.activo) {
      await deps.revocarSesion(accessToken);
      throw ApiError.forbidden('Tu cuenta está deshabilitada.');
    }

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: cuenta.id, usuario: cuenta.usuario, nombre: cuenta.nombre, rol: cuenta.rol,
        ...(cuenta.estudiante_id ? { estudianteId: cuenta.estudiante_id } : {}),
      },
    };
  }

  return { login };
}

export const loginConGoogle = (accessToken: string, refreshToken: string) =>
  crearLoginGoogle().login(accessToken, refreshToken);
