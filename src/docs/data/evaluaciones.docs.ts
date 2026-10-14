import { registerDocs } from '../registry';
import { OpenApiParameter } from '../types';

const nota = (descripcion: string) => ({ type: 'integer', minimum: 1, maximum: 10, description: descripcion });

const evaluacionFields = {
  id: { type: 'string', format: 'uuid' },
  alumno_id: { type: 'string', format: 'uuid' },
  profesor_id: { type: 'string', format: 'uuid' },
  fecha: { type: 'string', format: 'date', example: '2026-10-09' },
  rendimiento_tecnico: nota('Rendimiento técnico (1–10)'),
  rendimiento_fisico: nota('Rendimiento físico (1–10)'),
  actitud: nota('Actitud (1–10)'),
  observaciones: { type: 'string' },
  created_at: { type: 'string', format: 'date-time' },
  alumnos: {
    type: 'object',
    description: 'Datos básicos del alumno evaluado',
    properties: { nombres: { type: 'string' }, apellidos: { type: 'string' }, categoria_id: { type: 'string', format: 'uuid', nullable: true } },
  },
};
const evaluacionSchema = { type: 'object', properties: evaluacionFields };

const listQueryParams: OpenApiParameter[] = [
  { name: 'alumnoId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
  { name: 'profesorId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
  { name: 'desde', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
  { name: 'hasta', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
  { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
];

const crearBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['alumnoId', 'fecha', 'rendimientoTecnico', 'rendimientoFisico', 'actitud', 'observaciones'],
        properties: {
          alumnoId: { type: 'string', format: 'uuid' },
          profesorId: { type: 'string', format: 'uuid', description: 'Solo ADM (obligatorio para ADM). Un PROF usa su propio id.' },
          fecha: { type: 'string', format: 'date', example: '2026-10-09' },
          rendimientoTecnico: nota('1–10'),
          rendimientoFisico: nota('1–10'),
          actitud: nota('1–10'),
          observaciones: { type: 'string', maxLength: 1000 },
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
        description: 'Al menos un campo. No se puede cambiar el alumno ni el profesor.',
        properties: {
          fecha: crearBody.content['application/json'].schema.properties.fecha,
          rendimientoTecnico: nota('1–10'),
          rendimientoFisico: nota('1–10'),
          actitud: nota('1–10'),
          observaciones: { type: 'string', maxLength: 1000 },
        },
        additionalProperties: false,
      },
    },
  },
};

registerDocs({
  nombre: 'EVA — Evaluaciones Técnicas',
  responsable: 'Sebastian',
  endpoints: [
    {
      id: 'EVA-01',
      metodo: 'GET',
      ruta: '/evaluaciones',
      descripcion: 'Lista paginada de evaluaciones. ALU solo ve las suyas; PROF las de alumnos de sus categorías',
      acceso: 'Todos',
      implementado: true,
      queryParams: listQueryParams,
      responses: {
        '200': {
          description: 'Lista paginada: { data, meta: { page, limit, total } }',
          content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: evaluacionSchema }, meta: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } } } } } },
        },
      },
    },
    {
      id: 'EVA-02',
      metodo: 'POST',
      ruta: '/evaluaciones',
      descripcion: 'Registra una evaluación. PROF solo a alumnos de sus categorías; ADM debe indicar profesorId',
      acceso: 'ADM, PROF',
      implementado: true,
      requestBody: crearBody,
      responses: {
        '201': { description: 'Evaluación creada', content: { 'application/json': { schema: { type: 'object', properties: { data: evaluacionSchema } } } } },
        '422': { description: 'El alumno o el profesor indicado no existe' },
      },
    },
    {
      id: 'EVA-03',
      metodo: 'PUT',
      ruta: '/evaluaciones/:id',
      descripcion: 'Edita una evaluación (PROF solo las que él registró)',
      acceso: 'ADM, PROF',
      implementado: true,
      requestBody: actualizarBody,
      responses: {
        '200': { description: 'Evaluación actualizada', content: { 'application/json': { schema: { type: 'object', properties: { data: evaluacionSchema } } } } },
      },
    },
  ],
});
