import { registerDocs } from '../registry';
import type { OpenApiParameter } from '../types';

const id: OpenApiParameter = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const hora = { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' };
const eventoProps = {
  titulo: { type: 'string', maxLength: 150 },
  fecha: { type: 'string', format: 'date' },
  horaInicio: hora,
  horaFin: { ...hora, nullable: true },
  ubicacion: { type: 'string', maxLength: 200 },
  categoriaId: { type: 'string', format: 'uuid', nullable: true },
  descripcion: { type: 'string', nullable: true, maxLength: 2000 },
};
const cuerpo = (required: string[]) => ({ required: true, content: { 'application/json': { schema: {
  type: 'object', additionalProperties: false, required, properties: eventoProps,
} } } });

registerDocs({
  nombre: 'CAL — Calendario y eventos',
  endpoints: [
    { id: 'CAL-01', metodo: 'GET', ruta: '/eventos', acceso: 'Todos', implementado: true,
      descripcion: 'Lista de eventos del club (incluye nombre de categoría)',
      queryParams: [
        { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'categoriaId', in: 'query', schema: { type: 'string', format: 'uuid' } },
      ] },
    { id: 'CAL-02', metodo: 'POST', ruta: '/eventos', acceso: 'ADM', implementado: true,
      descripcion: 'Crea {titulo, fecha, horaInicio, horaFin?, ubicacion, categoriaId?, descripcion?}',
      requestBody: cuerpo(['titulo', 'fecha', 'horaInicio', 'ubicacion']),
      responses: { '201': { description: 'Creado' } } },
    { id: 'CAL-03', metodo: 'PUT', ruta: '/eventos/:id', acceso: 'ADM', implementado: true,
      descripcion: 'Edita (acepta campos parciales)', parameters: [id], requestBody: cuerpo([]) },
    { id: 'CAL-04', metodo: 'DELETE', ruta: '/eventos/:id', acceso: 'ADM', implementado: true,
      descripcion: 'Elimina', parameters: [id], responses: { '204': { description: 'Eliminado' } } },
    { id: 'CAL-05', metodo: 'GET', ruta: '/calendario/actividades', acceso: 'Todos', implementado: true,
      descripcion: 'Próximas actividades: entrenamientos de horarios activos (35 días) + eventos, ordenadas. Sin categoriaId: ALU → la suya, PROF → las suyas, ADM → todas',
      queryParams: [
        { name: 'categoriaId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'tipo', in: 'query', schema: { type: 'string', enum: ['entrenamiento', 'evento'] } },
        { name: 'limite', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
      ] },
  ],
});
