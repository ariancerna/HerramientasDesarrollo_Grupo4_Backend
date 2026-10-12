const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
const apiRoutes = require('../dist/routes').default;
const { supabaseAdmin, supabaseAnon } = require('../dist/config/supabase');
const { errorMiddleware } = require('../dist/middlewares/error.middleware');
const categorias = require('../dist/modules/categorias/categorias.service');
const horarios = require('../dist/modules/horarios/horarios.service');
const profesores = require('../dist/modules/profesores/profesores.service');
const adminId = '11111111-1111-4111-8111-111111111111';
const alumnoId = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
async function iniciarServidor(t, montarRouterPrincipal = false) {
  const usuarios = {
    'admin-token': {
      id: adminId, usuario: 'admin', email: 'admin@example.invalid', nombre: 'Admin',
      rol: 'ADM', estudiante_id: null, profesor_id: null, activo: true,
    },
    'profesor-token': { id: '44444444-4444-4444-8444-444444444444', usuario: 'profe', email: 'profe@example.invalid', nombre: 'Profe', rol: 'PROF', profesor_id: id, activo: true },
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
  app.use('/api/v1', apiRoutes);
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


test('CAT HOR PRF HTTP valida autenticacion, roles, cuerpos y UUID antes de escribir', async (t) => {
  const calls = [];
  for (const [name, service] of [['categorias', categorias], ['horarios', horarios], ['profesores', profesores]]) {
    for (const method of ['list', 'getById', 'create', 'update', 'remove']) {
      t.mock.method(service, method, async (...args) => { calls.push({ name, method, args }); return method === 'list' ? [] : { id }; });
    }
  }
  t.mock.method(profesores, 'asignarCategorias', async (...args) => { calls.push({ name: 'profesores', method: 'asignarCategorias', args }); return { id }; });
  const request = await iniciarServidor(t);
  const admin = { token: 'admin-token' };
  const alumno = { token: 'alumno-token' };
  for (const path of ['/categorias', `/categorias/${id}/horarios`, '/profesores']) {
    assert.equal((await request('/api/v1'+path)).status, 401);
  }
  assert.equal((await request('/api/v1/profesores', alumno)).status, 403);
  assert.equal((await request('/api/v1/profesores', { token: 'profesor-token' })).status, 403);
  assert.equal((await request('/api/v1/categorias', { token: 'profesor-token', method: 'POST', body: { nombre: 'Sub-12' } })).status, 403);
  for (const path of ['/categorias', `/categorias/${id}/horarios`, '/profesores']) {
    assert.equal((await request('/api/v1'+path, { ...alumno, method: 'POST', body: {} })).status, 403);
  }
  assert.equal(calls.length, 0);
  for (const path of ['/categorias/mal', `/categorias/${id}/horarios/mal`, '/profesores/mal']) {
    assert.equal((await request('/api/v1'+path, admin)).status, 400);
  }
  for (const path of ['/categorias', `/categorias/${id}/horarios`, '/profesores']) {
    assert.equal((await request('/api/v1'+path, { ...admin, method: 'POST', body: {} })).status, 400);
  }
  assert.equal(calls.length, 0);
  assert.equal((await request('/api/v1/categorias', alumno)).status, 200);
  assert.equal((await request(`/api/v1/categorias/${id}/horarios`, alumno)).status, 200);
  assert.equal((await request('/api/v1/categorias', { ...admin, method: 'POST', body: { nombre: ' Sub-12 ' } })).status, 201);
  assert.equal(calls.at(-1).args[0].nombre, 'Sub-12');
  assert.equal((await request(`/api/v1/categorias/${id}/horarios`, { ...admin, method: 'POST', body: { dia: 'lunes', horaInicio: '09:00', horaFin: '11:00' } })).status, 201);
  assert.equal(calls.at(-1).args[0], id);
  assert.equal((await request(`/api/v1/categorias/${id}/horarios/${alumnoId}`, { ...admin, method: 'PUT', body: { estado: 'cancelado' } })).status, 200);
  assert.deepEqual(calls.at(-1).args, [id, alumnoId, { estado: 'cancelado' }]);
  assert.equal((await request(`/api/v1/categorias/${id}/horarios/${alumnoId}`, { ...admin, method: 'DELETE' })).status, 204);
  assert.equal((await request('/api/v1/profesores', { ...admin, method: 'POST', body: { nombre: 'Profe', usuario: 'profe', email: 'profe@example.invalid', password: 'secreto', sedeId: id } })).status, 201);
  assert.equal((await request(`/api/v1/profesores/${id}/categorias`, { ...admin, method: 'PUT', body: { categoriaIds: [alumnoId] } })).status, 200);
  assert.deepEqual(calls.at(-1).args, [id, [alumnoId]]);
});
