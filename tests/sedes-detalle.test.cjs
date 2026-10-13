const { test } = require('node:test');
const assert = require('node:assert/strict');
const { servidor, supabaseAdmin, CATEGORIA_ID } = require('./helpers/alumnos-fixture.cjs');
const { databaseFixture } = require('./helpers/supabase-fixture.cjs');
const repository = require('../dist/modules/sedes/sedes.repository');
const service = require('../dist/modules/sedes/sedes.service');
const row = { id: CATEGORIA_ID, nombre: 'Sede de prueba', direccion: null, created_at: '2026-10-12T00:00:00Z' };

test('SED-02 repository scopes the UUID and selects only the documented fields', async (t) => {
  const fixture = databaseFixture({ sedes: [row] });
  t.mock.method(supabaseAdmin, 'from', (table) => fixture.client.from(table));
  assert.deepEqual(await repository.findById(row.id), row);
  assert.equal(fixture.requests[0].params.get('id'), 'eq.' + row.id);
  assert.equal(fixture.requests[0].params.get('select'), 'id,nombre,direccion,created_at');
});

test('SED-02 distinguishes a missing record from a database failure', async (t) => {
  const fixture = databaseFixture();
  t.mock.method(supabaseAdmin, 'from', (table) => fixture.client.from(table));
  assert.equal(await repository.findById(row.id), null);
  await assert.rejects(service.getById(row.id), { statusCode: 404 });
  fixture.failures.add('sedes');
  await assert.rejects(service.getById(row.id), { code: 'TEST_DB_ERROR' });
});

for (const token of ['admin', 'profesor', 'alumno']) {
  test('SED-02 HTTP allows authenticated role ' + token, async (t) => {
    t.mock.method(repository, 'findById', async () => row);
    const base = await servidor(t);
    const response = await fetch(base + '/sedes/' + row.id, {
      headers: { Authorization: 'Bearer ' + token },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: row });
  });
}

test('SED-02 HTTP blocks unauthenticated and invalid UUID requests before reading', async (t) => {
  const lookup = t.mock.method(repository, 'findById', async () => row);
  const base = await servidor(t);
  assert.equal((await fetch(base + '/sedes/' + row.id)).status, 401);
  assert.equal((await fetch(base + '/sedes/invalid', { headers: { Authorization: 'Bearer admin' } })).status, 400);
  assert.equal(lookup.mock.callCount(), 0);
});

test('SED-02 HTTP returns 404 for absent records and masks unexpected errors', async (t) => {
  t.mock.method(console, 'error', () => {});
  const lookup = t.mock.method(repository, 'findById', async () => null);
  const base = await servidor(t);
  const request = () => fetch(base + '/sedes/' + row.id, { headers: { Authorization: 'Bearer admin' } });
  assert.equal((await request()).status, 404);
  lookup.mock.mockImplementation(async () => { throw new Error('private database detail'); });
  const response = await request();
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes('private'), false);
});
