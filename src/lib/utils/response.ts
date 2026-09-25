import { Response } from 'express';

/** Respuesta 200 con un solo recurso u objeto. */
export function ok(res: Response, data: unknown) {
  return res.status(200).json({ data });
}

/** Respuesta 201 tras crear un recurso. */
export function created(res: Response, data: unknown) {
  return res.status(201).json({ data });
}

/** Respuesta paginada, formato acordado en docs/ENDPOINTS.md: { data, meta }. */
export function paginated(
  res: Response,
  data: unknown[],
  meta: { page: number; limit: number; total: number },
) {
  return res.status(200).json({ data, meta });
}
