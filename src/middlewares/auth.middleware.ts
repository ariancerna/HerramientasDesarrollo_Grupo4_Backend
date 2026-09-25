import { NextFunction, Request, Response } from 'express';
import { supabaseAnon } from '../config/supabase';
import { ApiError } from '../lib/errors/api-error';
import { AuthUser } from '../types/express';

/**
 * Verifica el JWT de Supabase que llega en "Authorization: Bearer <token>"
 * y arma req.user. Debe ir antes de requireRole en cada ruta protegida.
 *
 * TODO: además de validar el token, buscar en la tabla `usuarios` el rol,
 * y (si aplica) el estudianteId / profesorId asociados a este auth.users.id.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Falta el token de autenticación');
    }
    const token = header.replace('Bearer ', '');

    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data.user) {
      throw ApiError.unauthorized('Token inválido o expirado');
    }

    // TODO: reemplazar este mapeo por la consulta real a la tabla `usuarios`.
    const user: AuthUser = {
      id: data.user.id,
      usuario: data.user.email ?? '',
      nombre: (data.user.user_metadata?.nombre as string) ?? '',
      rol: (data.user.user_metadata?.rol as AuthUser['rol']) ?? 'ALU',
    };

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
