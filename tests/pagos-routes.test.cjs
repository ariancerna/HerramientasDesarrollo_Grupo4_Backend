const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const service = require('../dist/modules/pagos/pagos.service');
const pagosRoutes = require('../dist/modules/pagos/pagos.routes').default;
const mePagosRoutes = require('../dist/modules/pagos/pagos.routes').mePagosRoutes;
const apiRoutes = require('../dist/routes').default;
const { supabaseAdmin, supabaseAnon } = require('../dist/config/supabase');
const { errorMiddleware } = require('../dist/middlewares/error.middleware');

const adminId = '11111111-1111-4111-8111-111111111111';
const alumnoId = '22222222-2222-4222-8222-222222222222';
const pagoId = '33333333-3333-4333-8333-333333333333';

async function iniciarServidor(t, montarRouterPrincipal = false) {
  const usuarios = {
    'admin-token': {
      id: adminId, usuario: 'admin', email: 'admin@example.invalid', nombre: 'Admin',
      rol: 'ADM', estudiante_id: null, profesor_id: null, activo: true,
    },
    'alumno-token': {
      id: alumnoId, usuario: 'alumno', email: 'alumno@example.invalid', nombre: 'Alumno',
      rol: 'ALU', estudiante_id: alumnoId, profesor_id: null, activo: true,
    },
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
  if (montarRouterPrincipal) {
    app.use('/api/v1', apiRoutes);
  } else {
    app.use('/api/v1/pagos', pagosRoutes);
    app.use('/api/v1/me/pagos', mePagosRoutes);
  }
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

  return (ruta, { token, method = 'GET', body } = {}) => fetch(
    `http://127.0.0.1:${server.address().port}${ruta}`,
    {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
}

test('rutas PAG-01..09 requieren ADM y enrutan las rutas especiales antes de :id', async (t) => {
  const llamadas = [];
  const mocks = [
    ['list', async () => { llamadas.push('list'); return []; }],
    ['getById', async () => { llamadas.push('getById'); return { id: pagoId }; }],
    ['estadoMensual', async () => { llamadas.push('estadoMensual'); return { alumnos: [] }; }],
    ['create', async () => { llamadas.push('create'); return { id: pagoId }; }],
    ['update', async () => { llamadas.push('update'); return { id: pagoId }; }],
    ['registrarPorId', async () => { llamadas.push('registrarPorId'); return { id: pagoId }; }],
    ['registrarDirecto', async () => { llamadas.push('registrarDirecto'); return { pago: { id: pagoId }, creado: true }; }],
    ['marcarPendiente', async () => { llamadas.push('marcarPendiente'); return { id: pagoId }; }],
    ['generarMensualidad', async () => { llamadas.push('generarMensualidad'); return { periodo: '2026-10', generados: 1, pagos: [{ id: pagoId }] }; }],
    ['remove', async () => { llamadas.push('remove'); }],
  ];
  for (const [nombre, implementacion] of mocks) t.mock.method(service, nombre, implementacion);
  const request = await iniciarServidor(t);
  const admin = { token: 'admin-token' };
  const alumno = { token: 'alumno-token' };
  const metodo = 'Yape';

  assert.equal((await request('/api/v1/pagos/estado-mensual?periodo=2026-10', alumno)).status, 403);
  assert.equal((await request('/api/v1/pagos/registrar', {
    ...alumno,
    method: 'POST',
    body: { estudianteId: alumnoId, periodo: '2026-10', metodoPago: metodo },
  })).status, 403);
  assert.equal((await request('/api/v1/pagos/generar-mensualidad', {
    ...alumno,
    method: 'POST',
    body: { periodo: '2026-10' },
  })).status, 403);
  assert.equal((await request(`/api/v1/pagos/${pagoId}/registrar`, {
    ...alumno,
    method: 'POST',
    body: { metodoPago: metodo },
  })).status, 403);
  assert.equal((await request(`/api/v1/pagos/${pagoId}/marcar-pendiente`, {
    ...alumno,
    method: 'POST',
  })).status, 403);
  assert.equal((await request('/api/v1/pagos', alumno)).status, 403);

  assert.equal((await request('/api/v1/pagos/estado-mensual?periodo=2026-10', admin)).status, 200);
  assert.equal((await request('/api/v1/pagos', admin)).status, 200);
  assert.equal((await request('/api/v1/pagos', {
    ...admin,
    method: 'POST',
    body: { estudianteId: alumnoId, periodo: '2026-10' },
  })).status, 201);
  assert.equal((await request(`/api/v1/pagos/${pagoId}`, {
    ...admin,
    method: 'PATCH',
    body: { monto: 180 },
  })).status, 200);
  assert.equal((await request(`/api/v1/pagos/${pagoId}/registrar`, {
    ...admin,
    method: 'POST',
    body: { metodoPago: metodo },
  })).status, 200);
  assert.equal((await request('/api/v1/pagos/registrar', {
    ...admin,
    method: 'POST',
    body: { estudianteId: alumnoId, periodo: '2026-10', metodoPago: metodo },
  })).status, 201);
  assert.equal((await request(`/api/v1/pagos/${pagoId}/marcar-pendiente`, {
    ...admin,
    method: 'POST',
  })).status, 200);
  assert.equal((await request('/api/v1/pagos/generar-mensualidad', {
    ...admin,
    method: 'POST',
    body: { periodo: '2026-10' },
  })).status, 201);
  assert.equal((await request(`/api/v1/pagos/${pagoId}`, {
    ...admin,
    method: 'DELETE',
  })).status, 204);
  assert.equal((await request(`/api/v1/pagos/${pagoId}`, admin)).status, 200);

  assert.deepEqual(llamadas, [
    'estadoMensual',
    'list',
    'create',
    'update',
    'registrarPorId',
    'registrarDirecto',
    'marcarPendiente',
    'generarMensualidad',
    'remove',
    'getById',
  ]);
});

test('PAG-10 y PAG-11 requieren ALU y bloquean otros roles', async (t) => {
  let identidadConsultada;
  t.mock.method(service, 'history', async (usuario) => {
    identidadConsultada = usuario.estudianteId;
    return [{ id: 'p-historial' }];
  });
  t.mock.method(service, 'pagoActual', async (usuario) => {
    identidadConsultada = usuario.estudianteId;
    return null;
  });
  const request = await iniciarServidor(t);

  assert.equal((await request('/api/v1/me/pagos', { token: 'admin-token' })).status, 403);
  assert.equal((await request('/api/v1/me/pagos/actual', { token: 'admin-token' })).status, 403);

  const historial = await request('/api/v1/me/pagos', { token: 'alumno-token' });
  assert.equal(historial.status, 200);
  assert.deepEqual(await historial.json(), { data: [{ id: 'p-historial' }] });
  assert.equal(identidadConsultada, alumnoId);

  const actual = await request('/api/v1/me/pagos/actual', { token: 'alumno-token' });
  assert.equal(actual.status, 200);
  assert.deepEqual(await actual.json(), { data: null });
  assert.equal(identidadConsultada, alumnoId);
});

test('validadores de rutas rechazan parámetros y cuerpos inválidos antes del servicio', async (t) => {
  const update = t.mock.method(service, 'update', async () => ({ id: pagoId }));
  const registrar = t.mock.method(service, 'registrarPorId', async () => ({ id: pagoId }));
  const generar = t.mock.method(service, 'generarMensualidad', async () => ({ generados: 0, pagos: [] }));
  const request = await iniciarServidor(t);
  const admin = { token: 'admin-token' };

  assert.equal((await request('/api/v1/pagos/no-uuid/registrar', {
    ...admin,
    method: 'POST',
    body: { metodoPago: 'Yape' },
  })).status, 400);
  assert.equal((await request('/api/v1/pagos/no-uuid/marcar-pendiente', {
    ...admin,
    method: 'POST',
  })).status, 400);
  assert.equal((await request('/api/v1/pagos/no-uuid', {
    ...admin,
    method: 'PATCH',
    body: { monto: 180 },
  })).status, 400);
  assert.equal((await request('/api/v1/pagos/registrar', {
    ...admin,
    method: 'POST',
    body: { estudianteId: alumnoId, periodo: '2026-10', metodoPago: 'Bitcoin' },
  })).status, 400);
  assert.equal((await request('/api/v1/pagos/generar-mensualidad', {
    ...admin,
    method: 'POST',
    body: { periodo: '2026-13' },
  })).status, 400);
  assert.equal((await request('/api/v1/pagos/estado-mensual?periodo=2026-13', admin)).status, 400);
  assert.equal((await request('/api/v1/pagos?estudianteId=no-uuid', admin)).status, 400);
  assert.equal(update.mock.callCount(), 0);
  assert.equal(registrar.mock.callCount(), 0);
  assert.equal(generar.mock.callCount(), 0);
});

test('todas las rutas PAG protegidas requieren autenticación', async (t) => {
  const request = await iniciarServidor(t);

  assert.equal((await request('/api/v1/pagos/estado-mensual?periodo=2026-10')).status, 401);
  assert.equal((await request('/api/v1/pagos/registrar', { method: 'POST', body: {} })).status, 401);
  assert.equal((await request('/api/v1/pagos/generar-mensualidad', { method: 'POST', body: {} })).status, 401);
  assert.equal((await request('/api/v1/me/pagos')).status, 401);
  assert.equal((await request('/api/v1/me/pagos/actual')).status, 401);
});

test('el router principal expone mis pagos exactamente en /api/v1/me/pagos', async (t) => {
  let alumnoConsultado;
  t.mock.method(service, 'history', async (usuario) => {
    alumnoConsultado = usuario.estudianteId;
    return [{ id: 'p-historial' }];
  });
  t.mock.method(service, 'pagoActual', async (usuario) => {
    alumnoConsultado = usuario.estudianteId;
    return null;
  });
  const request = await iniciarServidor(t, true);

  const historial = await request('/api/v1/me/pagos', { token: 'alumno-token' });
  assert.equal(historial.status, 200);
  assert.deepEqual(await historial.json(), { data: [{ id: 'p-historial' }] });
  assert.equal(alumnoConsultado, alumnoId);

  const actual = await request('/api/v1/me/pagos/actual', { token: 'alumno-token' });
  assert.equal(actual.status, 200);
  assert.deepEqual(await actual.json(), { data: null });
  assert.equal(alumnoConsultado, alumnoId);
});
