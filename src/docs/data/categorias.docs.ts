import { registerDocs } from '../registry';
const properties = { nombre: { type: 'string', minLength: 3, maxLength: 100 }, descripcion: { type: 'string', nullable: true, maxLength: 1000 } };
const body = (required: string[]) => ({ required: true, content: { 'application/json': { schema: { type: 'object', properties, required, additionalProperties: false } } } });
registerDocs({ nombre: 'CAT - Categorías', responsable: 'Arian', endpoints: [
  { id: 'CAT-01', metodo: 'GET', ruta: '/categorias', descripcion: 'Lista categorías con horarios y profesorIds', acceso: 'Todos', implementado: true, queryParams: [{ name: 'texto', in: 'query', schema: { type: 'string', maxLength: 100 } }] },
  { id: 'CAT-02', metodo: 'GET', ruta: '/categorias/:id', descripcion: 'Detalle de categoría', acceso: 'Todos', implementado: true },
  { id: 'CAT-03', metodo: 'POST', ruta: '/categorias', descripcion: 'Crea categoría', acceso: 'ADM', implementado: true, requestBody: body(['nombre']), responses: { '201': { description: 'Creada' } } },
  { id: 'CAT-04', metodo: 'PUT', ruta: '/categorias/:id', descripcion: 'Edita al menos un campo', acceso: 'ADM', implementado: true, requestBody: body([]) },
  { id: 'CAT-05', metodo: 'DELETE', ruta: '/categorias/:id', descripcion: 'Elimina; 409 si tiene registros asociados', acceso: 'ADM', implementado: true, responses: { '204': { description: 'Eliminada' }, '409': { description: 'Referencias existentes' } } },
] });
