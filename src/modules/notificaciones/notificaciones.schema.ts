import { z } from 'zod';

// TODO: reemplazar por los campos reales de notificacion (ver docs/ENDPOINTS.md, módulo NOTIFICACIONES).
export const crearNotificacionSchema = z.object({});

export const actualizarNotificacionSchema = crearNotificacionSchema.partial();
