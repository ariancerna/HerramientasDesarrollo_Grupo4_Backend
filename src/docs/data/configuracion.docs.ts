import { registerDocs } from '../registry';

const preferences = {
  tema: { type: 'string', enum: ['claro', 'oscuro', 'sistema'] },
  notificacionesSilenciadas: { type: 'boolean' },
};
const response = { description: 'Preferencias de la cuenta autenticada',
  content: { 'application/json': { schema: {
    type: 'object', required: ['data'], properties: { data: {
      type: 'object', required: ['tema', 'notificacionesSilenciadas'], properties: preferences,
    } },
  } } },
};
registerDocs({
  nombre: 'CFG — Configuración personal', responsable: 'Andre',
  endpoints: [{
    id: 'CFG-01', metodo: 'GET', ruta: '/me/configuracion',
    descripcion: 'Consulta preferencias; sin fila devuelve sistema y notificaciones no silenciadas (SCRUM-143)',
    acceso: 'Todos', implementado: true,
    responses: { '200': response, '500': { description: 'Fallo inesperado de base de datos' } },
  }, {
    id: 'CFG-02', metodo: 'PATCH', ruta: '/me/configuracion',
    descripcion: 'Guarda solo las preferencias enviadas, de forma atómica (SCRUM-144)',
    acceso: 'Todos', implementado: true,
    requestBody: { required: true, content: { 'application/json': { schema: {
      type: 'object', minProperties: 1, additionalProperties: false, properties: preferences,
    } } } },
    responses: { '200': response, '500': { description: 'Fallo de persistencia o migración pendiente' } },
  }],
});
