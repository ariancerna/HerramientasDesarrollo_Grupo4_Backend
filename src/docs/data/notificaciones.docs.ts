import { registerDocs } from '../registry';

const id = { name: 'id', in: 'path' as const, required: true, schema: { type: 'string', format: 'uuid' } };
const body = { required: true, content: { 'application/json': { schema: {
  type: 'object', additionalProperties: false, required: ['usuarioId', 'titulo'], properties: {
    usuarioId: { type: 'string', format: 'uuid' }, titulo: { type: 'string' },
    descripcion: { type: 'string', nullable: true }, tipo: { type: 'string', nullable: true },
    href: { type: 'string', nullable: true },
  },
} } } };

registerDocs({ nombre: 'NOT — Notificaciones', responsable: 'Rodrigo', endpoints: [
  { id: 'NOT-01', metodo: 'GET', ruta: '/me/notificaciones',
    descripcion: 'Lista solo las notificaciones propias; incluye total y cantidad no leída',
    acceso: 'Todos', implementado: true, queryParams: [
      { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
      { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
      { name: 'leida', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
    ] },
  { id: 'NOT-02', metodo: 'GET', ruta: '/me/notificaciones/:id',
    descripcion: 'Consulta una notificación propia', acceso: 'Todos', implementado: true, parameters: [id] },
  { id: 'NOT-03', metodo: 'PATCH', ruta: '/me/notificaciones/:id/leida',
    descripcion: 'Marca una notificación propia como leída', acceso: 'Todos', implementado: true, parameters: [id] },
  { id: 'NOT-04', metodo: 'DELETE', ruta: '/me/notificaciones/:id',
    descripcion: 'Elimina una notificación propia', acceso: 'Todos', implementado: true, parameters: [id],
    responses: { '204': { description: 'Eliminada' } } },
  { id: 'NOT-05', metodo: 'POST', ruta: '/notificaciones',
    descripcion: 'Crea una notificación dirigida a un usuario del club', acceso: 'ADM', implementado: true,
    requestBody: body, responses: { '201': { description: 'Creada' } } },
] });
