import { registerDocs } from '../registry';
const properties = {
  dia: { type: 'string', enum: ['lunes', 'martes', 'mi\u00e9rcoles', 'jueves', 'viernes', 's\u00e1bado', 'domingo'] },
  horaInicio: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }, horaFin: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
  cancha: { type: 'string', nullable: true, maxLength: 100 }, estado: { type: 'string', enum: ['activo', 'cancelado'] },
};
const body = (required: string[]) => ({ required: true, content: { 'application/json': { schema: { type: 'object', properties, required, additionalProperties: false } } } });
registerDocs({ nombre: 'HOR - Horarios de entrenamiento', responsable: 'Arian', endpoints: [
  { id: 'HOR-01', metodo: 'GET', ruta: '/categorias/:id/horarios', descripcion: 'Lista horarios de categoria', acceso: 'Todos', implementado: true, queryParams: [{ name: 'estado', in: 'query', schema: { type: 'string', enum: ['activo', 'cancelado'] } }] },
  { id: 'HOR-02', metodo: 'GET', ruta: '/categorias/:id/horarios/:horarioId', descripcion: 'Detalle de horario', acceso: 'Todos', implementado: true },
  { id: 'HOR-03', metodo: 'POST', ruta: '/categorias/:id/horarios', descripcion: 'Crea horario', acceso: 'ADM', implementado: true, requestBody: body(['dia', 'horaInicio', 'horaFin']), responses: { '201': { description: 'Creado' }, '409': { description: 'Dia repetido' } } },
  { id: 'HOR-04', metodo: 'PUT', ruta: '/categorias/:id/horarios/:horarioId', descripcion: 'Edita o cancela un horario', acceso: 'ADM', implementado: true, requestBody: body([]) },
  { id: 'HOR-05', metodo: 'DELETE', ruta: '/categorias/:id/horarios/:horarioId', descripcion: 'Elimina horario', acceso: 'ADM', implementado: true, responses: { '204': { description: 'Eliminado' } } },
] });
