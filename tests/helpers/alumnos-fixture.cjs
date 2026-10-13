// Configuración ficticia: las pruebas nunca usan las credenciales de .env.
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const express = require('express');
const { supabaseAdmin, supabaseAnon } = require('../../dist/config/supabase');
const repository = require('../../dist/modules/alumnos/alumnos.repository');
const service = require('../../dist/modules/alumnos/alumnos.service');
const schemas = require('../../dist/modules/alumnos/alumnos.schema');
const routes = require('../../dist/routes').default;
const { errorMiddleware } = require('../../dist/middlewares/error.middleware');
const { buildOpenApiSpec } = require('../../dist/docs/openapi');
require('../../dist/docs/data');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const PROFESOR_ID = '22222222-2222-4222-8222-222222222222';
const ALUMNO_ID = '33333333-3333-4333-8333-333333333333';
const CATEGORIA_ID = '44444444-4444-4444-8444-444444444444';
const OTRA_CATEGORIA_ID = '55555555-5555-4555-8555-555555555555';
const ALUMNO_USER_ID = '66666666-6666-4666-8666-666666666666';

const admin = { id: ADMIN_ID, rol: 'ADM' };
const profesor = { id: PROFESOR_ID, rol: 'PROF', profesorId: PROFESOR_ID };
const alumno = { id: ALUMNO_USER_ID, rol: 'ALU', estudianteId: ALUMNO_ID };
const nuevoAlumno = {
  dni: '12345678', nombres: 'Ana', apellidos: 'Prueba', email: 'ana@example.invalid',
  codigo: 'TEST-12345678', categoriaId: CATEGORIA_ID,
};

function mockCreateLookups(t) {
  t.mock.method(repository, 'findByDni', async () => null);
  t.mock.method(repository, 'findByCodigo', async () => null);
  t.mock.method(repository, 'findByEmail', async () => null);
  t.mock.method(repository, 'findCategoriaById', async () => ({ id: CATEGORIA_ID }));
}

async function servidor(t, users = { admin, profesor, alumno }) {
  const rows = Object.fromEntries(Object.entries(users).map(([token, user]) => [token, {
    id: user.id, usuario: token, email: `${token}@example.invalid`, nombre: 'Cuenta de prueba',
    rol: user.rol, estudiante_id: user.estudianteId ?? null, profesor_id: user.profesorId ?? null,
    activo: true,
  }]));
  t.mock.method(supabaseAnon.auth, 'getUser', async (token) => ({
    data: { user: rows[token] ? { id: rows[token].id } : null }, error: null,
  }));
  t.mock.method(supabaseAdmin, 'from', (table) => {
    if (table !== 'usuarios') throw new Error(`Consulta real no permitida en pruebas: ${table}`);
    return { select: () => ({ eq: (_field, id) => ({ single: async () => ({
      data: Object.values(rows).find((row) => row.id === id) ?? null, error: null,
    }) }) }) };
  });
  const app = express();
  app.use(express.json());
  app.use('/api/v1', routes);
  app.use(errorMiddleware);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}/api/v1`;
}

module.exports = {
  repository, service, schemas, buildOpenApiSpec, supabaseAdmin,
  ADMIN_ID, PROFESOR_ID, ALUMNO_ID, ALUMNO_USER_ID, CATEGORIA_ID, OTRA_CATEGORIA_ID,
  admin, profesor, alumno, nuevoAlumno, mockCreateLookups, servidor,
};
