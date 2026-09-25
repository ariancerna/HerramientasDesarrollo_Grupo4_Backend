import { z } from 'zod';

// TODO: reemplazar por los campos reales de pago (ver docs/ENDPOINTS.md, módulo PAGOS).
export const crearPagoSchema = z.object({});

export const actualizarPagoSchema = crearPagoSchema.partial();
