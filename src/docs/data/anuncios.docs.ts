import { registerDocs } from '../registry';
import type { OpenApiParameter } from '../types';

const id: OpenApiParameter = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const cuerpo = (required: string[]) => ({ required: true, content: { 'application/json': { schema: {
  type: 'object', additionalProperties: false, required, properties: {
    titulo: { type: 'string', maxLength: 150 }, mensaje: { type: 'string', maxLength: 5000 },
    destinatarios: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', format: 'uuid' },
      description: 'alumnoIds de mis categorías' },
    categoriaId: { type: 'string', format: 'uuid', nullable: true },
    estado: { type: 'string', enum: ['borrador', 'enviado'] },
  },
} } } });

registerDocs({
  nombre: 'ANU — Anuncios',
  endpoints: [
    { id: 'ANU-01', metodo: 'GET', ruta: '/anuncios', acceso: 'PROF', implementado: true,
      descripcion: 'Mis anuncios (borradores y enviados), más reciente primero, paginado',
      queryParams: [
        { name: 'estado', in: 'query', schema: { type: 'string', enum: ['borrador', 'enviado'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
      ] },
    { id: 'ANU-02', metodo: 'POST', ruta: '/anuncios', acceso: 'PROF', implementado: true,
      descripcion: 'Crea {titulo, mensaje, destinatarios[], categoriaId?, estado}. Si estado = "enviado" genera las notificaciones',
      requestBody: cuerpo(['titulo', 'mensaje', 'destinatarios']), responses: { '201': { description: 'Creado' } } },
    { id: 'ANU-03', metodo: 'PUT', ruta: '/anuncios/:id', acceso: 'PROF', implementado: true,
      descripcion: 'Edita (solo el autor). Un anuncio enviado no puede volver a borrador (409)', parameters: [id], requestBody: cuerpo([]) },
    { id: 'ANU-04', metodo: 'DELETE', ruta: '/anuncios/:id', acceso: 'PROF', implementado: true,
      descripcion: 'Elimina (solo el autor)', parameters: [id], responses: { '204': { description: 'Eliminado' } } },
    { id: 'ANU-05', metodo: 'POST', ruta: '/anuncios/:id/enviar', acceso: 'PROF', implementado: true,
      descripcion: 'Pasa de borrador a enviado y genera las notificaciones (409 si ya estaba enviado)', parameters: [id] },
    { id: 'ANU-06', metodo: 'GET', ruta: '/me/anuncios', acceso: 'ALU', implementado: true,
      descripcion: 'Anuncios enviados en los que soy destinatario',
      queryParams: [{ name: 'limite', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }] },
  ],
});
