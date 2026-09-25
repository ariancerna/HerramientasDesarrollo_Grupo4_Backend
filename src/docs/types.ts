export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface EndpointDoc {
  /** ID tal como aparece en docs/ENDPOINTS.md, ej. "AUTH-01" */
  id: string;
  metodo: MetodoHttp;
  /** Ruta completa desde /api/v1, ej. "/auth/login" */
  ruta: string;
  descripcion: string;
  /** Quién puede llamarlo: "Público", "ADM", "PROF", "ALU", "Todos", "ADM, PROF"... */
  acceso: string;
  /** Marca real de si YA está programado (no solo la ruta creada, sino la lógica). */
  implementado: boolean;
}

export interface ModuloDoc {
  /** Nombre del módulo tal como en docs/ENDPOINTS.md, ej. "AUTH — Autenticación" */
  nombre: string;
  /** Quién lo está trabajando (opcional, para que el equipo sepa a quién preguntar). */
  responsable?: string;
  endpoints: EndpointDoc[];
}