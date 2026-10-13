const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { databaseFixture } = require('./helpers/supabase-fixture.cjs');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const { ApiError } = require('../dist/lib/errors/api-error');
const { crearPagosRepository } = require('../dist/modules/pagos/pagos.repository');
const { crearPagosService, periodoActualEnLima } = require('../dist/modules/pagos/pagos.service');
const pagosService = require('../dist/modules/pagos/pagos.service');
const pagosRoutes = require('../dist/modules/pagos/pagos.routes').default;
const mePagosRoutes = require('../dist/modules/pagos/pagos.routes').mePagosRoutes;
const { supabaseAdmin, supabaseAnon } = require('../dist/config/supabase');
const { errorMiddleware } = require('../dist/middlewares/error.middleware');
require('../dist/docs/data');
const { buildOpenApiSpec } = require('../dist/docs/openapi');

const alumnoId = '33333333-3333-4333-8333-333333333333';
const adminId = '11111111-1111-4111-8111-111111111111';
const estudianteId = '22222222-2222-4222-8222-222222222222';

test('PAG-02 incluye activos sin cargo, representa sin_cargo y calcula los totales tras filtrar', async () => {
  const fixture = databaseFixture({
    alumnos: [
      { id: alumnoId, nombres: 'Ana', apellidos: 'Rojas', dni: '12345678', codigo: 'A-1', estado: 'activo' },
      { id: estudianteId, nombres: 'Bruno', apellidos: 'Díaz', dni: '23456789', codigo: null, estado: 'activo' },
      { id: '44444444-4444-4444-8444-444444444444', nombres: 'Cami', apellidos: 'Paz', dni: '34567890', codigo: 'C-3', estado: 'activo' },
      { id: '55555555-5555-4555-8555-555555555555', nombres: 'Inactivo', apellidos: 'Rojas', dni: '45678901', codigo: null, estado: 'inactivo' },
    ],
    pagos: [
      { id: 'p1', alumno_id: alumnoId, periodo: '2026-10', monto: '180.00', estado: 'pagado', fecha_pago: '2026-10-03', metodo_pago: 'Yape', codigo_operacion: null, vencimiento: null },
      { id: 'p2', alumno_id: estudianteId, periodo: '2026-10', monto: '180.00', estado: 'vencido', fecha_pago: null, metodo_pago: null, codigo_operacion: null, vencimiento: '2026-10-01' },
    ],
  });
  const service = crearPagosService(crearPagosRepository(fixture.client));

  const todos = await service.estadoMensual({ periodo: '2026-10', filtro: 'todos' });
  assert.deepEqual(todos.totales, { alumnos: 3, alDia: 1, porPagar: 2 });
  assert.equal(todos.alumnos[2].estado, 'sin_cargo');
  assert.equal(todos.alumnos[2].pago, null);

  const porPagar = await service.estadoMensual({ periodo: '2026-10', filtro: 'porPagar' });
  assert.deepEqual(porPagar.alumnos.map((alumno) => alumno.estudianteId), [
    estudianteId,
    '44444444-4444-4444-8444-444444444444',
  ]);
  assert.deepEqual(porPagar.totales, { alumnos: 2, alDia: 0, porPagar: 2 });

  const alDia = await service.estadoMensual({ periodo: '2026-10', filtro: 'alDia' });
  assert.deepEqual(alDia.alumnos.map((alumno) => alumno.estudianteId), [alumnoId]);
  assert.deepEqual(alDia.totales, { alumnos: 1, alDia: 1, porPagar: 0 });
});

test('PAG-02 filtra texto y evita consultar pagos cuando no hay alumnos coincidentes', async () => {
  const fixture = databaseFixture({
    alumnos: [{ id: alumnoId, nombres: 'Ana', apellidos: 'Rojas', dni: '12345678', codigo: 'A-1', estado: 'activo' }],
    pagos: [],
  });
  const service = crearPagosService(crearPagosRepository(fixture.client));

  const resultado = await service.estadoMensual({ periodo: '2026-10', texto: 'no existe', filtro: 'todos' });
  assert.deepEqual(resultado.alumnos, []);
  assert.deepEqual(resultado.totales, { alumnos: 0, alDia: 0, porPagar: 0 });
  assert.equal(fixture.requests.filter((request) => request.table === 'pagos').length, 0);
});

test('PAG-03 transforma la restricción única de la base de datos en HTTP 409', async () => {
  const client = {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { code: '23505', message: 'duplicate key' } }),
        }),
      }),
    }),
  };
  const repository = crearPagosRepository(client);

  await assert.rejects(repository.create({ estudianteId: alumnoId, periodo: '2026-10' }), (error) =>
    error instanceof ApiError && error.statusCode === 409 && error.code === 'CONFLICT');
});

test('PAG-11 devuelve null si el alumno autenticado aún no tiene cargo en el período Lima actual', async () => {
  const fixture = databaseFixture({
    pagos: [{
      id: 'p-ajeno', alumno_id: estudianteId, periodo: '2026-12', monto: 180, estado: 'pagado',
      fecha_pago: '2026-12-01', metodo_pago: 'Yape', codigo_operacion: null, vencimiento: null,
    }],
  });
  const service = crearPagosService(crearPagosRepository(fixture.client), () => new Date('2027-01-01T03:00:00Z'));

  assert.equal(periodoActualEnLima(new Date('2027-01-01T03:00:00Z')), '2026-12');
  assert.equal(await service.pagoActual({ id: 'auth-user', rol: 'ALU', estudianteId: alumnoId }), null);
  assert.equal(fixture.requests[0].params.get('alumno_id'), `eq.${alumnoId}`);
  assert.equal(fixture.requests[0].params.get('periodo'), 'eq.2026-12');
});

test('PAG-11 rechaza cuentas ALU que no tienen un alumno vinculado', async () => {
  const service = crearPagosService(crearPagosRepository(databaseFixture({ pagos: [] }).client));
  await assert.rejects(service.pagoActual({ id: 'auth-user', rol: 'ALU' }), (error) =>
    error instanceof ApiError && error.statusCode === 403);
});

async function servidorPagos(t) {
  const usuarios = {
    'admin-token': { id: adminId, usuario: 'admin', email: 'admin@example.invalid', nombre: 'Admin', rol: 'ADM', estudiante_id: null, profesor_id: null, activo: true },
    'alumno-token': { id: '66666666-6666-4666-8666-666666666666', usuario: 'alumno', email: 'alumno@example.invalid', nombre: 'Alumno', rol: 'ALU', estudiante_id: alumnoId, profesor_id: null, activo: true },
  };
  t.mock.method(supabaseAnon.auth, 'getUser', async (token) => ({
    data: { user: usuarios[token] ? { id: usuarios[token].id } : null },
    error: null,
  }));
  t.mock.method(supabaseAdmin, 'from', (tabla) => {
    assert.equal(tabla, 'usuarios');
    return {
      select: () => ({
        eq: (_campo, id) => ({
          single: async () => ({
            data: Object.values(usuarios).find((usuario) => usuario.id === id) ?? null,
            error: null,
          }),
        }),
      }),
    };
  });

  const app = express();
  app.use(express.json());
  app.use('/api/v1/pagos', pagosRoutes);
  app.use('/api/v1/me/pagos', mePagosRoutes);
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
  return (ruta, token, options = {}) => fetch(`http://127.0.0.1:${server.address().port}${ruta}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
  });
}

test('rutas de pagos aplican roles y PAG-11 solo consulta el alumno vinculado al token', async (t) => {
  let consultado;
  t.mock.method(pagosService, 'estadoMensual', async () => ({ totales: { alumnos: 0, alDia: 0, porPagar: 0 }, alumnos: [] }));
  t.mock.method(pagosService, 'create', async () => { throw ApiError.conflict('Ya existe el pago'); });
  t.mock.method(pagosService, 'pagoActual', async (usuario) => {
    consultado = usuario.estudianteId;
    return null;
  });
  const request = await servidorPagos(t);

  assert.equal((await request('/api/v1/pagos/estado-mensual?periodo=2026-10', 'alumno-token')).status, 403);
  assert.equal((await request('/api/v1/pagos/estado-mensual?periodo=2026-10', 'admin-token')).status, 200);
  assert.equal((await request('/api/v1/pagos', 'admin-token', {
    method: 'POST',
    body: JSON.stringify({ estudianteId: alumnoId, periodo: '2026-10' }),
  })).status, 409);
  assert.equal((await request('/api/v1/pagos', 'alumno-token', {
    method: 'POST',
    body: JSON.stringify({ estudianteId: alumnoId, periodo: '2026-10' }),
  })).status, 403);

  const actual = await request('/api/v1/me/pagos/actual', 'alumno-token');
  assert.equal(actual.status, 200);
  assert.deepEqual(await actual.json(), { data: null });
  assert.equal(consultado, alumnoId);
  assert.equal((await request('/api/v1/me/pagos/actual', 'admin-token')).status, 403);
});

test('validaciones de PAG-02 y PAG-03 rechazan período, filtro, UUID y monto inválidos', async (t) => {
  t.mock.method(pagosService, 'estadoMensual', async () => { throw new Error('No debe ejecutar el servicio'); });
  t.mock.method(pagosService, 'create', async () => { throw new Error('No debe ejecutar el servicio'); });
  const request = await servidorPagos(t);

  assert.equal((await request('/api/v1/pagos/estado-mensual?periodo=2026-13', 'admin-token')).status, 400);
  assert.equal((await request('/api/v1/pagos/estado-mensual?periodo=2026-10&filtro=pendientes', 'admin-token')).status, 400);
  assert.equal((await request('/api/v1/pagos', 'admin-token', {
    method: 'POST',
    body: JSON.stringify({ estudianteId: 'no-es-uuid', periodo: '2026-10', monto: 0 }),
  })).status, 400);
});

test('Swagger publica las reglas confirmadas de PAG-02, PAG-03 y PAG-11', () => {
  const { paths } = buildOpenApiSpec();
  assert.equal(paths['/pagos/estado-mensual'].get.operationId, 'PAG-02');
  assert.ok(paths['/pagos/estado-mensual'].get.description.includes('ADM'));
  assert.deepEqual(
    paths['/pagos/estado-mensual'].get.parameters.find((parametro) => parametro.name === 'filtro').schema.enum,
    ['todos', 'alDia', 'porPagar'],
  );
  assert.equal(paths['/pagos'].post.operationId, 'PAG-03');
  assert.ok(paths['/pagos'].post.responses['409']);
  assert.equal(paths['/me/pagos/actual'].get.operationId, 'PAG-11');
  assert.ok(paths['/me/pagos/actual'].get.description.includes('ALU'));
});
