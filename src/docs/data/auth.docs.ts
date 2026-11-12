import { registerDocs } from '../registry';

registerDocs({
  nombre: 'AUTH — Autenticación',
  responsable: 'Eduardo',
  endpoints: [
    { id: 'AUTH-01', metodo: 'POST', ruta: '/auth/login', descripcion: '{usuario, password} → tokens + Usuario', acceso: 'Público', implementado: true },
    {
      id: 'AUTH-12', metodo: 'GET', ruta: '/auth/google/url',
      descripcion: 'Devuelve la URL de Supabase que inicia el acceso con Google y vuelve a redirectTo (debe estar en Authentication > URL Configuration > Redirect URLs).',
      acceso: 'Público', implementado: true,
      parameters: [{ name: 'redirectTo', in: 'query', required: true, schema: { type: 'string', format: 'uri', example: 'http://localhost:3000/auth/callback' } }],
      responses: { '200': { description: 'URL de autorización', content: { 'application/json': { schema: {
        type: 'object', properties: { data: { type: 'object', properties: { url: { type: 'string', format: 'uri' } } } },
      } } } } },
    },
    {
      id: 'AUTH-13', metodo: 'POST', ruta: '/auth/google',
      descripcion: 'Recibe los tokens que Supabase entregó tras autenticar con Google y devuelve la sesión del club. Si el correo ya tiene cuenta entra con su rol; si es de un alumno inscrito sin cuenta, se la crea; si no pertenece al club, se rechaza.',
      acceso: 'Público', implementado: true,
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', additionalProperties: false, required: ['accessToken', 'refreshToken'],
        properties: { accessToken: { type: 'string' }, refreshToken: { type: 'string' } },
      } } } },
      responses: {
        '200': { description: 'Sesión iniciada: tokens + Usuario' },
        '401': { description: 'Token de Google inválido o expirado' },
        '403': { description: 'Correo no registrado en el club o cuenta deshabilitada' },
        '409': { description: 'El correo ya tiene una cuenta con otro acceso' },
      },
    },
    { id: 'AUTH-02', metodo: 'POST', ruta: '/auth/logout', descripcion: 'Cierra la sesión', acceso: 'Todos', implementado: true },
    { id: 'AUTH-03', metodo: 'POST', ruta: '/auth/refresh', descripcion: 'Renueva el accessToken con el refreshToken', acceso: 'Público', implementado: true },
    { id: 'AUTH-04', metodo: 'GET', ruta: '/auth/me', descripcion: 'Devuelve el usuario de la sesión actual', acceso: 'Todos', implementado: true },
    { id: 'AUTH-06', metodo: 'GET', ruta: '/auth/usuario-disponible', descripcion: '¿El nombre de usuario está libre?', acceso: 'Público', implementado: true },
    { id: 'AUTH-05', metodo: 'POST', ruta: '/auth/register', descripcion: '{dni, usuario, password} → crea credenciales para un alumno ya existente', acceso: 'Público', implementado: true },
    { id: 'AUTH-07', metodo: 'POST', ruta: '/auth/password/forgot', descripcion: '{correo} → envía código de 6 dígitos', acceso: 'Público', implementado: true },
    { id: 'AUTH-08', metodo: 'POST', ruta: '/auth/password/verify', descripcion: '{correo, codigo} → devuelve resetToken y el nombre de usuario de la cuenta', acceso: 'Público', implementado: true },
    { id: 'AUTH-09', metodo: 'POST', ruta: '/auth/password/reset', descripcion: '{resetToken, nuevaPassword} → cambia la clave', acceso: 'Público', implementado: true },
    {
      id: 'AUTH-10', metodo: 'PATCH', ruta: '/auth/password',
      descripcion: 'Cambia la contraseña de la cuenta autenticada (SCRUM-58)',
      acceso: 'Todos', implementado: true,
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', additionalProperties: false, required: ['passwordActual', 'passwordNueva'],
        properties: {
          passwordActual: { type: 'string', minLength: 1, writeOnly: true },
          passwordNueva: { type: 'string', minLength: 6, writeOnly: true,
            description: 'Distinta de la actual; también aplica la política de Supabase.' },
        },
      } } } },
      responses: {
        '200': { description: 'Contraseña actualizada', content: { 'application/json': { schema: {
          type: 'object', properties: { data: { type: 'object', properties: { mensaje: { type: 'string' } } } },
        } } } },
        '429': { description: 'Límite de intentos de Supabase alcanzado' },
        '500': { description: 'Fallo del proveedor de autenticación, sin detalles internos' },
      },
    },
  ],
});
