import { registerDocs } from '../registry';
import { OpenApiParameter } from '../types';

const estado = { type: 'string', enum: ['borrador', 'enviado'] };

const anuncioSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    profesor_id: { type: 'string', format: 'uuid' },
    titulo: { type: 'string' },
    mensaje: { type: 'string' },
    categoria_id: { type: 'string', format: 'uuid', nullable: true },
    estado,
    created_at: { type: 'string', format: 'date-time' },
    alumno_ids: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'Destinatarios (en crear/editar/detalle)' },
  },
};

const listQueryParams: OpenApiParameter[] = [
  { name: 'categoriaId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
  { name: 'estado', in: 'query', required: false, schema: estado },
  { name: 'profesorId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
  { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
];

const campos = {
  titulo: { type: 'string', minLength: 3, maxLength: 150 },
  mensaje: { type: 'string', maxLength: 2000 },
  categoriaId: { type: 'string', format: 'uuid', description: 'Si no hay alumnoIds, los destinatarios son los alumnos activos de esta categoría' },
  alumnoIds: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'Destinatarios explícitos' },
};

const crearBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['titulo', 'mensaje'],
        properties: {
          ...campos,
          estado: { ...estado, default: 'borrador', description: '"enviado" exige destinatarios (categoría con alumnos o alumnoIds)' },
          profesorId: { type: 'string', format: 'uuid', description: 'Solo ADM (obligatorio para ADM). Un PROF usa su propio id.' },
        },
        additionalProperties: false,
      },
    },
  },
};

const actualizarBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        description: 'Al menos un campo. Si envías alumnoIds se reemplazan los destinatarios.',
        properties: { ...campos, estado },
        additionalProperties: false,
      },
    },
  },
};

registerDocs({
  nombre: 'ANU — Anuncios y Comunicados',
  responsable: 'Sebastian',
  endpoints: [
    {
      id: 'ANU-01',
      metodo: 'GET',
      ruta: '/anuncios',
      descripcion: 'Lista paginada. PROF ve los que publicó; ALU solo los "enviado" dirigidos a él',
      acceso: 'Todos',
      implementado: true,
      queryParams: listQueryParams,
      responses: {
        '200': {
          description: 'Lista paginada: { data, meta: { page, limit, total } }',
          content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: anuncioSchema }, meta: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } } } } } },
        },
      },
    },
    {
      id: 'ANU-02',
      metodo: 'POST',
      ruta: '/anuncios',
      descripcion: 'Crea un anuncio (borrador o enviado) y sus destinatarios',
      acceso: 'ADM, PROF',
      implementado: true,
      requestBody: crearBody,
      responses: {
        '201': { description: 'Anuncio creado', content: { 'application/json': { schema: { type: 'object', properties: { data: anuncioSchema } } } } },
        '422': { description: 'La categoría o algún alumno indicado no existe' },
      },
    },
    {
      id: 'ANU-03',
      metodo: 'PUT',
      ruta: '/anuncios/:id',
      descripcion: 'Edita un anuncio y/o sus destinatarios (PROF solo los suyos)',
      acceso: 'ADM, PROF',
      implementado: true,
      requestBody: actualizarBody,
      responses: {
        '200': { description: 'Anuncio actualizado', content: { 'application/json': { schema: { type: 'object', properties: { data: anuncioSchema } } } } },
      },
    },
  ],
});
