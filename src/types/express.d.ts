// Extiende el Request de Express con el usuario autenticado (lo llena auth.middleware.ts).
import 'express';

export type Rol = 'ADM' | 'PROF' | 'ALU';

export interface AuthUser {
  id: string;          // id de Supabase Auth (auth.users.id)
  usuario: string;
  nombre: string;
  rol: Rol;
  estudianteId?: string; // solo si rol === 'ALU'
  profesorId?: string; 
  email: string;  // solo si rol === 'PROF'
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
