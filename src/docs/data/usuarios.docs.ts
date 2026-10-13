import { registerDocs } from '../registry';

registerDocs({
  nombre: 'USR — Cuentas de acceso',
  responsable: 'Eduardo',
  endpoints: [
    { id: 'USR-02', metodo: 'PATCH', ruta: '/usuarios/:id/estado', descripcion: '{activo} bloquear / habilitar acceso', acceso: 'ADM', implementado: true },
    {
      id: 'USR-01', metodo: 'POST', ruta: '/alumnos/:id/cuenta',
      descripcion: 'Crea credenciales para un alumno existente con compensación de Auth (SCRUM-49)',
      acceso: 'ADM', implementado: true,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', additionalProperties: false, required: ['usuario', 'password'],
        properties: {
          usuario: { type: 'string', minLength: 3, maxLength: 50 },
          password: { type: 'string', minLength: 6, writeOnly: true },
        },
      } } } },
      responses: {
        '201': { description: 'Cuenta creada', content: { 'application/json': { schema: {
          type: 'object', properties: { data: { type: 'object', properties: { mensaje: { type: 'string' } } } },
        } } } },
        '409': { description: 'Alumno, nombre de usuario o correo con cuenta existente' },
        '500': { description: 'Fallo de creación; AUTH_CLEANUP_REQUIRED requiere limpiar solo authUserId' },
      },
    },
    { id: 'USR-03', metodo: 'POST', ruta: '/usuarios/:id/reset-password', descripcion: '{nuevaPassword} el admin restablece la contraseña de un alumno o profesor', acceso: 'ADM', implementado: true },
  ],
});
