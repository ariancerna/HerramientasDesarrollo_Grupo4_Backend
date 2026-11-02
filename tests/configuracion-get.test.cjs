const { test } = require('node:test');
const assert = require('node:assert/strict');
const { servidor, supabaseAdmin, ADMIN_ID, PROFESOR_ID, ALUMNO_USER_ID,
  buildOpenApiSpec } = require('./helpers/alumnos-fixture.cjs');
const { databaseFixture } = require('./helpers/supabase-fixture.cjs');
const repository = require('../dist/modules/configuracion/configuracion.repository');

test('CFG-01 defaults only when no row exists and never writes during GET', async (t) => {
  const fixture = databaseFixture();
  t.mock.method(supabaseAdmin, 'from', (table) => fixture.client.from(table));
  assert.deepEqual(await repository.obtenerMiConfig(ADMIN_ID), { tema: 'sistema', notificacionesSilenciadas: false });
  assert.ok(fixture.requests.every((request) => request.method === 'GET'));
  assert.equal(fixture.requests[0].params.get('usuario_id'), 'eq.' + ADMIN_ID);
});

test('CFG-01 maps snake_case SQL preferences without exposing the owner UUID', async (t) => {
  const fixture = databaseFixture({ configuraciones_usuario: [
    { usuario_id: ADMIN_ID, tema: 'oscuro', notificaciones_silenciadas: true },
    { usuario_id: ALUMNO_USER_ID, tema: 'claro', notificaciones_silenciadas: false },
  ] });
  t.mock.method(supabaseAdmin, 'from', (table) => fixture.client.from(table));
  assert.deepEqual(await repository.obtenerMiConfig(ADMIN_ID), { tema: 'oscuro', notificacionesSilenciadas: true });
  assert.equal(fixture.requests[0].params.get('select'), 'tema,notificaciones_silenciadas');
  fixture.failures.add('configuraciones_usuario');
  await assert.rejects(repository.obtenerMiConfig(ADMIN_ID), { code: 'TEST_DB_ERROR' });
});

for (const [token, id] of [['admin', ADMIN_ID], ['profesor', PROFESOR_ID], ['alumno', ALUMNO_USER_ID]]) {
  test('CFG-01 HTTP serves only the authenticated ' + token + ' account at /me/configuracion', async (t) => {
    const getter = t.mock.method(repository, 'obtenerMiConfig', async () => ({
      tema: 'oscuro', notificacionesSilenciadas: false,
    }));
    const base = await servidor(t);
    const response = await fetch(base + '/me/configuracion', { headers: { Authorization: 'Bearer ' + token } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: { tema: 'oscuro', notificacionesSilenciadas: false } });
    assert.deepEqual(getter.mock.calls[0].arguments, [id]);
  });
}

test('CFG-01 HTTP rejects unauthenticated, inactive and impersonation requests without reading settings', async (t) => {
  const getter = t.mock.method(repository, 'obtenerMiConfig', async () => ({}));
  const base = await servidor(t, { admin: { id: ADMIN_ID, rol: 'ADM' },
    inactivo: { id: ALUMNO_USER_ID, rol: 'ALU', activo: false } });
  assert.equal((await fetch(base + '/me/configuracion')).status, 401);
  assert.equal((await fetch(base + '/me/configuracion', { headers: { Authorization: 'Bearer inactivo' } })).status, 403);
  assert.equal((await fetch(base + '/me/configuracion?usuarioId=' + ALUMNO_USER_ID,
    { headers: { Authorization: 'Bearer admin' } })).status, 400);
  assert.equal(getter.mock.callCount(), 0);
});

test('CFG-01 HTTP propagates database errors instead of disguising them as defaults', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(repository, 'obtenerMiConfig', async () => { throw new Error('private detail'); });
  const base = await servidor(t);
  const response = await fetch(base + '/me/configuracion', { headers: { Authorization: 'Bearer admin' } });
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes('private'), false);
});

test('CFG-01 Swagger matches the canonical route and two-field response', () => {
  const operation = buildOpenApiSpec().paths['/me/configuracion'].get;
  assert.equal(operation.operationId, 'CFG-01');
  const fields = operation.responses['200'].content['application/json'].schema.properties.data.properties;
  assert.deepEqual(Object.keys(fields), ['tema', 'notificacionesSilenciadas']);
});
