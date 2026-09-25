import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  from: number;
  to: number;
}

/** Lee ?page=&limit= de la query y calcula el rango para .range() de Supabase. */
export function getPagination(req: Request, defaultLimit = 20, maxLimit = 100): PaginationParams {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || defaultLimit));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, limit, from, to };
}
