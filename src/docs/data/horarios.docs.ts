import { registerDocs } from '../registry';
import type { OpenApiParameter } from '../types';

const parameters: OpenApiParameter[] = ['id', 'horarioId'].map((name) => ({
  name, in: 'path', required: true, schema: { type: 'string', format: 'uuid' },
}));

const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const hora = {
  type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$',
  description: 'HH:mm o HH:mm:ss. La hora final resultante debe ser posterior a la inicial.',
};
const horarioResponse = {
  type: 'object',
  required: ['id', 'categoriaId', 'dia', 'horaInicio', 'horaFin', 'cancha', 'estado', 'createdAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    categoriaId: { type: 'string', format: 'uuid' },
    dia: { type: 'string', enum: dias },
    horaInicio: hora, horaFin: hora,
    cancha: { type: 'string', nullable: true },
    estado: { type: 'string', enum: ['activo', 'cancelado'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

registerDocs({
  nombre: 'HOR — Horarios de entrenamiento',
  responsable: 'Andre',
  endpoints: [{
    id: 'HOR-01', metodo: 'GET', ruta: '/categorias/:id/horarios',
    descripcion: 'Lista horarios de categoría', acceso: 'Todos', implementado: true,
    parameters: [parameters[0]],
    queryParams: [{ name: 'estado', in: 'query', schema: { type: 'string', enum: ['activo', 'cancelado'] } }],
  }, {
    id: 'HOR-02', metodo: 'GET', ruta: '/categorias/:id/horarios/:horarioId',
    descripcion: 'Detalle de horario', acceso: 'Todos', implementado: true, parameters,
  }, {
    id: 'HOR-CREATE', metodo: 'POST', ruta: '/categorias/:id/horarios',
    descripcion: 'Crea horario (CRUD integrado de dev)', acceso: 'ADM', implementado: true,
    parameters: [parameters[0]],
    requestBody: { required: true, content: { 'application/json': { schema: {
      type: 'object', additionalProperties: false, required: ['dia', 'horaInicio', 'horaFin'],
      properties: {
        dia: { type: 'string', enum: dias },
        horaInicio: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' },
        horaFin: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' },
        cancha: { type: 'string', nullable: true, maxLength: 100 },
        estado: { type: 'string', enum: ['activo', 'cancelado'], default: 'activo' },
      },
    } } } },
    responses: { '201': { description: 'Creado' }, '409': { description: 'Día repetido' } },
  }, {
    id: 'HOR-04-PUT', metodo: 'PUT', ruta: '/categorias/:id/horarios/:horarioId',
    descripcion: 'Alias compatible de edición parcial integrado de dev', acceso: 'ADM',
    implementado: true, parameters,
    requestBody: { required: true, content: { 'application/json': { schema: {
      type: 'object', additionalProperties: false, minProperties: 1,
      properties: {
        dia: { type: 'string', enum: dias }, horaInicio: hora, horaFin: hora,
        cancha: { type: 'string', nullable: true, minLength: 1, maxLength: 200 },
        estado: { type: 'string', enum: ['activo', 'cancelado'] },
      },
    } } } },
  }, {
    id: 'HOR-03', metodo: 'DELETE', ruta: '/categorias/:id/horarios/:horarioId',
    descripcion: 'Elimina físicamente un horario de la categoría indicada (SCRUM-99)',
    acceso: 'ADM', implementado: true, parameters,
    responses: {
      '204': { description: 'Horario eliminado. Respuesta sin contenido.' },
      '409': { description: 'El horario tiene registros asociados y no puede eliminarse.' },
      '500': { description: 'Error interno del servidor.' },
    },
  }, {
    id: 'HOR-04', metodo: 'PATCH', ruta: '/categorias/:id/horarios/:horarioId',
    descripcion: 'Edita parcialmente día, horas, cancha y estado de un horario (SCRUM-100)',
    acceso: 'ADM', implementado: true, parameters,
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object', minProperties: 1, additionalProperties: false,
            properties: {
              dia: { type: 'string', enum: dias, description: 'Se normalizan espacios y mayúsculas.' },
              horaInicio: hora, horaFin: hora,
              cancha: { type: 'string', nullable: true, minLength: 1, maxLength: 200,
                description: 'Se recortan espacios. null elimina la cancha; texto vacío no es válido.' },
              estado: { type: 'string', enum: ['activo', 'cancelado'] },
            },
          },
          example: { dia: 'miércoles', horaInicio: '18:00', horaFin: '20:00',
            cancha: 'Cancha 2', estado: 'activo' },
        },
      },
    },
    responses: {
      '200': {
        description: 'Horario actualizado. Los campos omitidos conservan su valor.',
        content: { 'application/json': { schema: {
          type: 'object', required: ['data'], properties: { data: horarioResponse },
        } } },
      },
      '413': { description: 'El cuerpo excede el límite de tamaño del servidor.' },
      '409': { description: 'Ya existe un horario para ese día en la categoría.' },
      '500': { description: 'Error interno del servidor.' },
    },
  }],
});
