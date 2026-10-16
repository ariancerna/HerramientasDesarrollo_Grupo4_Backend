import { registerDocs } from '../registry';
import type { OpenApiParameter } from '../types';

const id: OpenApiParameter = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const nota = { type: 'integer', minimum: 1, maximum: 10, nullable: true };
const cuerpo = (required: string[]) => ({ required: true, content: { 'application/json': { schema: {
  type: 'object', additionalProperties: false, required, properties: {
    alumnoId: { type: 'string', format: 'uuid' }, fecha: { type: 'string', format: 'date' },
    rendimientoTecnico: nota, rendimientoFisico: nota, actitud: nota,
    observaciones: { type: 'string', minLength: 1, maxLength: 2000 },
  },
} } } });

registerDocs({
  nombre: 'EVA — Evaluaciones',
  endpoints: [
    { id: 'EVA-01', metodo: 'GET', ruta: '/evaluaciones', acceso: 'PROF, ADM', implementado: true,
      descripcion: 'Mis evaluaciones (PROF) o todas (ADM), fecha desc, paginado { data, meta }',
      queryParams: [
        { name: 'alumnoId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
      ] },
    { id: 'EVA-02', metodo: 'POST', ruta: '/evaluaciones', acceso: 'PROF', implementado: true,
      descripcion: 'Crea evaluación de un alumno de mis categorías. Notas 1–10, observaciones obligatorias; profesorId sale del token',
      requestBody: cuerpo(['alumnoId', 'fecha', 'observaciones']), responses: { '201': { description: 'Creada' } } },
    { id: 'EVA-03', metodo: 'PUT', ruta: '/evaluaciones/:id', acceso: 'PROF', implementado: true,
      descripcion: 'Edita (solo el autor; campos parciales)', parameters: [id], requestBody: cuerpo([]) },
    { id: 'EVA-04', metodo: 'DELETE', ruta: '/evaluaciones/:id', acceso: 'PROF', implementado: true,
      descripcion: 'Elimina (solo el autor)', parameters: [id], responses: { '204': { description: 'Eliminada' } } },
  ],
});
