import { z } from 'zod';

// TODO: reemplazar por los campos reales de sede (ver docs/ENDPOINTS.md, módulo SEDES).
export const crearSedeSchema = z.object({});

export const actualizarSedeSchema = crearSedeSchema.partial();
