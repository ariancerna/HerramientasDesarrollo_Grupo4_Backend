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
const { crearPagosService } = require('../dist/modules/pagos/pagos.service');
const pagosService = require('../dist/modules/pagos/pagos.service');
const pagosRoutes = require('../dist/modules/pagos/pagos.routes').default;
const mePagosRoutes = require('../dist/modules/pagos/pagos.routes').mePagosRoutes;
const { supabaseAdmin, supabaseAnon } = require('../dist/config/supabase');
const { errorMiddleware } = require('../dist/middlewares/error.middleware');

const adminId = '11111111-1111-4111-8111-111111111111';
const alumnoId = '22222222-2222-4222-8222-222222222222';

async function iniciarServidor(t) {
  const usuarios = {
    'admin-token': {
      id: adminId,
      usuario: 'admin',
      email: 'admin@example.invalid',
      nombre: 'Admin',
      rol: 'ADM',
      estudiante_id: null,
      profesor_id: null,
      activo: true,
    },
    'alumno-token': {
      id: '33333333-3333-4333-8333-333333333333',
      usuario: 'alumno',
      email: 'alumno@example.invalid',
      nombre: 'Alumno',
      rol: 'ALU',
      estudiante_id: alumnoId,
      profesor_id: null,
      activo: true,
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

test('solo ADM administra pagos y ALU consulta el historial de su vínculo autenticado', async (t) => {
  let alumnoConsultado;
  t.mock.method(pagosService, 'estadoMensual', async () => ({ alumnos: [], totales: {} }));
  t.mock.method(pagosService, 'create', async () => ({ id: 'p1' }));
  t.mock.method(pagosService, 'history', async (usuario) => {
    alumnoConsultado = usuario.estudianteId;
    return [{ id: 'historial-propio' }];
  });
  t.mock.method(pagosService, 'pagoActual', async (usuario) => {
    alumnoConsultado = usuario.estudianteId;
    return null;
  });
  const request = await iniciarServidor(t);

  assert.equal((await request('/api/v1/pagos/estado-mensual?periodo=2026-10', {
    token: 'admin-token',
  })).status, 200);
  assert.equal((await request('/api/v1/pagos/estado-mensual?periodo=2026-10', {
    token: 'alumno-token',
  })).status, 403);
  assert.equal((await request('/api/v1/pagos', {
    token: 'alumno-token',
    method: 'POST',
    body: { estudianteId: alumnoId, periodo: '2026-10' },
  })).status, 403);
  assert.equal((await request('/api/v1/me/pagos', { token: 'admin-token' })).status, 403);
  assert.equal((await request('/api/v1/me/pagos/actual', { token: 'admin-token' })).status, 403);

  const historial = await request('/api/v1/me/pagos?estudianteId=otro-alumno', {
    token: 'alumno-token',
  });
  assert.equal(historial.status, 200);
  assert.deepEqual(await historial.json(), { data: [{ id: 'historial-propio' }] });
  assert.equal(alumnoConsultado, alumnoId);

  const mensualidad = await request('/api/v1/me/pagos/actual', { token: 'alumno-token' });
  assert.equal(mensualidad.status, 200);
  assert.deepEqual(await mensualidad.json(), { data: null });
  assert.equal(alumnoConsultado, alumnoId);
});

test('un cargo duplicado termina en HTTP 409', async (t) => {
  const { create } = crearPagosRepository({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: null,
            error: { code: '23505', message: 'duplicate key violates unique constraint' },
          }),
        }),
      }),
    }),
  });

  await assert.rejects(create({ estudianteId: alumnoId, periodo: '2026-10' }), (error) =>
    error instanceof ApiError && error.statusCode === 409 && error.code === 'CONFLICT');
});

test('registrar pago guarda estado pagado, fecha Lima, método y código de operación', async () => {
  let actualizacion;
  const service = crearPagosService({
    updatePaymentDetails: async (id, datos) => {
      actualizacion = { id, ...datos };
      return actualizacion;
    },
  }, () => new Date('2026-10-11T03:30:00Z'));

  await service.registrarPorId('p1', { metodoPago: 'Yape', codigoOperacion: 'OP-123' });
  assert.deepEqual(actualizacion, {
    id: 'p1',
    estado: 'pagado',
    fechaPago: '2026-10-10',
    metodoPago: 'Yape',
    codigoOperacion: 'OP-123',
  });
});

test('marcar pendiente limpia fecha, método y código del pago', async () => {
  let actualizacion;
  const service = crearPagosService({
    updatePaymentDetails: async (id, datos) => {
      actualizacion = { id, ...datos };
      return actualizacion;
    },
  });

  await service.marcarPendiente('p1');
  assert.deepEqual(actualizacion, {
    id: 'p1',
    estado: 'pendiente',
    fechaPago: null,
    metodoPago: null,
    codigoOperacion: null,
  });
});

test('generación mensual ignora duplicados por alumno y período', async () => {
  let filasEnviadas;
  let opciones;
  const pagoNuevo = {
    id: 'p-alumno-b',
    alumno_id: 'alumno-b',
    periodo: '2026-10',
    estado: 'pendiente',
  };
  const repo = crearPagosRepository({
    from: () => ({
      upsert: (filas, config) => {
        filasEnviadas = filas;
        opciones = config;
        return {
          select: () => ({
            returns: async () => ({ data: [pagoNuevo], error: null }),
          }),
        };
      },
    }),
  });
  const resultado = await repo.createManyIfMissing([
    { estudianteId: 'alumno-a', periodo: '2026-10' },
    { estudianteId: 'alumno-b', periodo: '2026-10' },
  ]);

  assert.deepEqual(filasEnviadas, [
    { alumno_id: 'alumno-a', periodo: '2026-10' },
    { alumno_id: 'alumno-b', periodo: '2026-10' },
  ]);
  assert.deepEqual(opciones, {
    onConflict: 'alumno_id,periodo',
    ignoreDuplicates: true,
  });
  assert.deepEqual(resultado, [pagoNuevo]);
});

test('historial del alumno está ordenado por período descendente y excluye a otros alumnos', async () => {
  const fixture = databaseFixture({
    pagos: [
      { id: 'ago', alumno_id: 'alumno-a', periodo: '2026-08', estado: 'pagado' },
      { id: 'oct', alumno_id: 'alumno-a', periodo: '2026-10', estado: 'pendiente' },
      { id: 'sep', alumno_id: 'alumno-a', periodo: '2026-09', estado: 'vencido' },
      { id: 'otro', alumno_id: 'alumno-b', periodo: '2026-11', estado: 'pagado' },
    ],
  });
  const repo = crearPagosRepository(fixture.client);

  const historial = await repo.findHistoryForStudent('alumno-a');
  assert.deepEqual(historial.map((pago) => pago.id), ['oct', 'sep', 'ago']);
  assert.equal(fixture.requests[0].params.get('alumno_id'), 'eq.alumno-a');
  assert.equal(fixture.requests[0].params.get('order'), 'periodo.desc,id.asc');
});
