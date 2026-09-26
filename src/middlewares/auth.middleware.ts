import { NextFunction, Request, Response } from 'express';
import { supabaseAdmin, supabaseAnon } from '../config/supabase';
import { ApiError } from '../lib/errors/api-error';
import { AuthUser } from '../types/express';

/**
 * Verifica el JWT de Supabase que llega en "Authorization: Bearer <token>"
 * y arma req.user con los datos REALES de la tabla `usuarios` (no del
 * user_metadata de Supabase Auth, que puede desincronizarse). Debe ir
 * antes de requireRole en cada ruta protegida.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Falta el token de autenticación');
    }
    const token = header.replace('Bearer ', '');

    // 1) El token es válido y no expiró (lo confirma Supabase Auth).
    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data.user) {
      throw ApiError.unauthorized('Token inválido o expirado');
    }

    // 2) El rol/nombre/usuario reales salen de nuestra tabla `usuarios`,
    // que es la fuente de verdad (se llena en auth.register o USR-01).
    const { data: fila, error: filaError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (filaError || !fila) {
      throw ApiError.unauthorized('Tu cuenta no está configurada correctamente. Contacta a un administrador.');
    }

    if (fila.activo === false) {
      throw ApiError.forbidden('Tu cuenta está deshabilitada.');
    }

    const user: AuthUser = {
      id: fila.id,
      usuario: fila.usuario,
      email: fila.email,
      nombre: fila.nombre,
      rol: fila.rol,
      estudianteId: fila.estudiante_id ?? undefined,
      profesorId: fila.profesor_id ?? undefined,
    };

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}