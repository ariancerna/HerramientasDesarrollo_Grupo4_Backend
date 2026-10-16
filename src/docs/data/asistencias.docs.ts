import { registerDocs } from '../registry';
import type { OpenApiParameter } from '../types';

const id: OpenApiParameter = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const paginacion: OpenApiParameter[] = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
];
const registro = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    estudianteId: { type: 'string', format: 'uuid' },
    estudiante: { type: 'string' },
    dni: { type: 'string', nullable: true },
    codigo: { type: 'string', nullable: true },
    categoriaId: { type: 'string', format: 'uuid', nullable: true },
    categoria: { type: 'string', nullable: true },
    fecha: { type: 'string', format: 'date', description: 'Día en America/Lima' },
    fechaHora: { type: 'string', format: 'date-time' },
    metodo: { type: 'string', enum: ['ESCANEO', 'MANUAL'] },
  },
};
const lista = { '200': { description: 'Lista paginada', content: { 'application/json': { schema: {
  type: 'object', properties: { data: { type: 'array', items: registro },
    meta: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } } },
} } } } };

registerDocs({
  nombre: 'ASI — Asistencia',
  endpoints: [
    { id: 'ASI-01', metodo: 'POST', ruta: '/asistencias', acceso: 'PROF, ADM', implementado: true,
      descripcion: 'Registra asistencia por dni (escáner) o estudianteId. 404 alumno no existe · 409 ya tiene asistencia ese día · 403 no es de mis categorías · 422 alumno inactivo',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', additionalProperties: false, required: ['metodo'], properties: {
          dni: { type: 'string', pattern: '^\\d{8}$' }, estudianteId: { type: 'string', format: 'uuid' },
          metodo: { type: 'string', enum: ['ESCANEO', 'MANUAL'] }, fechaHora: { type: 'string', format: 'date-time' },
        },
      } } } },
      responses: { '201': { description: 'Registrada', content: { 'application/json': { schema: {
        type: 'object', properties: { data: registro } } } } }, '409': { description: 'Ya tiene asistencia ese día' },
        '422': { description: 'Alumno inactivo o fecha futura' } } },
    { id: 'ASI-02', metodo: 'GET', ruta: '/asistencias', acceso: 'ADM, PROF', implementado: true,
      descripcion: 'Lista paginada, más reciente primero. PROF solo ve sus categorías',
      queryParams: [
        { name: 'texto', in: 'query', schema: { type: 'string', maxLength: 100 } },
        { name: 'categoriaId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'fecha', in: 'query', schema: { type: 'string', format: 'date' } },
        ...paginacion,
      ], responses: lista },
    { id: 'ASI-03', metodo: 'PATCH', ruta: '/asistencias/:id', acceso: 'ADM', implementado: true,
      descripcion: 'Corrige {fechaHora, metodo} (409 si genera duplicado)', parameters: [id],
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', additionalProperties: false, properties: {
          fechaHora: { type: 'string', format: 'date-time' }, metodo: { type: 'string', enum: ['ESCANEO', 'MANUAL'] },
        },
      } } } } },
    { id: 'ASI-04', metodo: 'DELETE', ruta: '/asistencias/:id', acceso: 'ADM', implementado: true,
      descripcion: 'Anula un registro erróneo', parameters: [id], responses: { '204': { description: 'Anulada' } } },
    { id: 'ASI-05', metodo: 'GET', ruta: '/me/asistencias', acceso: 'ALU', implementado: true,
      descripcion: 'Mi historial de asistencias (paginado)',
      queryParams: [
        { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'metodo', in: 'query', schema: { type: 'string', enum: ['ESCANEO', 'MANUAL'] } },
        ...paginacion,
      ], responses: lista },
  ],
});
