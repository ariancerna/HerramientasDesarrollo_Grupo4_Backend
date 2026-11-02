import { registerDocs } from '../registry';
const properties = {
  nombre: { type: 'string', minLength: 1, maxLength: 150 }, usuario: { type: 'string', minLength: 3, maxLength: 50, pattern: '^[a-zA-Z0-9._-]+$' },
  email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 6, maxLength: 72, writeOnly: true },
  sedeId: { type: 'string', format: 'uuid' }, categoriaIds: { type: 'array', maxItems: 100, uniqueItems: true, items: { type: 'string', format: 'uuid' } },
};
const body = (fields: string[], required: string[]) => ({ required: true, content: { 'application/json': { schema: { type: 'object', properties: Object.fromEntries(fields.map((key) => [key, properties[key as keyof typeof properties]])), required, additionalProperties: false } } } });
registerDocs({ nombre: 'PRF - Profesores', responsable: 'Arian', endpoints: [
  { id: 'PRF-01', metodo: 'GET', ruta: '/profesores', descripcion: 'Lista profesores sin contrasenas', acceso: 'ADM', implementado: true, queryParams: [{ name: 'texto', in: 'query', schema: { type: 'string', maxLength: 100 } }, { name: 'sedeId', in: 'query', schema: { type: 'string', format: 'uuid' } }] },
  { id: 'PRF-02', metodo: 'GET', ruta: '/profesores/:id', descripcion: 'Detalle con categorias asignadas', acceso: 'ADM', implementado: true },
  { id: 'PRF-03', metodo: 'POST', ruta: '/profesores', descripcion: 'Crea cuenta Auth y perfil de profesor', acceso: 'ADM', implementado: true, requestBody: body(Object.keys(properties), ['nombre', 'usuario', 'email', 'password', 'sedeId']), responses: { '201': { description: 'Creado' }, '409': { description: 'Usuario o correo ocupado' } } },
  { id: 'PRF-04', metodo: 'PUT', ruta: '/profesores/:id', descripcion: 'Edita nombre, usuario, sede, password (opcional) y sincroniza categoriaIds; exige un campo', acceso: 'ADM', implementado: true, requestBody: body(['nombre', 'usuario', 'sedeId', 'password', 'categoriaIds'], []) },
  { id: 'PRF-05', metodo: 'DELETE', ruta: '/profesores/:id', descripcion: 'Quita acceso (cuenta y Auth) y asignaciones; conserva el perfil para el historial (soft delete). Reintentable si falla Auth', acceso: 'ADM', implementado: true, responses: { '204': { description: 'Eliminado' }, '500': { description: 'Reintentar limpieza de Auth' } } },
  { id: 'PRF-CAT', metodo: 'PUT', ruta: '/profesores/:id/categorias', descripcion: 'Reemplaza asignaciones; [] desasigna todas', acceso: 'ADM', implementado: true, requestBody: body(['categoriaIds'], ['categoriaIds']) },
  { id: 'PRF-06', metodo: 'GET', ruta: '/me/categorias', descripcion: 'Categorías asignadas al profesor logueado (con horarios y profesorIds)', acceso: 'PROF', implementado: true },
] });
