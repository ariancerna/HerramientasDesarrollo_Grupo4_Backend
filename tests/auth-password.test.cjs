const { test } = require('node:test');
const assert = require('node:assert/strict');
const { servidor, ADMIN_ID } = require('./helpers/alumnos-fixture.cjs');
const config = require('../dist/config/supabase');
const repository = require('../dist/modules/auth/auth.repository');
const service = require('../dist/modules/auth/auth.service');
const { changePasswordSchema } = require('../dist/modules/auth/auth.schema');

function authFixture(t, options = {}) {
  const calls = [];
  const clients = [];
  t.mock.method(config, 'crearClienteAuthAislado', () => {
    const client = { auth: {
      signInWithPassword: async (body) => {
        calls.push(['verify', body]);
        return { data: { user: { id: options.userId ?? ADMIN_ID },
          session: options.noSession ? null : {} }, error: options.verifyError ?? null };
      },
      updateUser: async (body) => {
        calls.push(['update', body]);
        return { data: { user: { id: ADMIN_ID } }, error: options.updateError ?? null };
      },
      signOut: async (body) => {
        calls.push(['signout', body]);
        return { error: options.cleanupError ?? null };
      },
    } };
    clients.push(client);
    return client;
  });
  t.mock.method(config.supabaseAnon.auth, 'signInWithPassword', () => {
    throw new Error('The shared auth client must never be mutated');
  });
  return { calls, clients };
}

test('AUTH-10 updates only the verified account using a private session and closes it', async (t) => {
  const fixture = authFixture(t);
  await service.changePassword('admin@example.invalid', ADMIN_ID, 'anterior123', 'nueva123');
  assert.deepEqual(fixture.calls, [
    ['verify', { email: 'admin@example.invalid', password: 'anterior123' }],
    ['update', { password: 'nueva123' }], ['signout', { scope: 'local' }],
  ]);
  await service.changePassword('admin@example.invalid', ADMIN_ID, 'nueva123', 'otra123');
  assert.notEqual(fixture.clients[0], fixture.clients[1]);
});

for (const [error, status] of [
  [{ code: 'invalid_credentials', status: 400 }, 401],
  [{ code: 'over_request_rate_limit', status: 429 }, 429],
  [{ code: 'unexpected_failure', status: 500 }, 500],
]) {
  test('AUTH-10 handles verification error ' + error.code + ' without updating', async (t) => {
    const fixture = authFixture(t, { verifyError: error });
    await assert.rejects(service.changePassword('admin@example.invalid', ADMIN_ID, 'actual123', 'nueva123'),
      { statusCode: status });
    assert.equal(fixture.calls.some(([method]) => method === 'update'), false);
  });
}

for (const options of [{ userId: 'another-account' }, { noSession: true }]) {
  test('AUTH-10 rejects an unverified or mismatched identity', async (t) => {
    const fixture = authFixture(t, options);
    await assert.rejects(repository.cambiarPasswordPropia('admin@example.invalid', ADMIN_ID, 'old', 'new'),
      { statusCode: 401 });
    assert.equal(fixture.calls.some(([method]) => method === 'update'), false);
  });
}

for (const [error, status] of [
  [{ code: 'weak_password', status: 422 }, 400],
  [{ code: 'same_password', status: 422 }, 400],
  [{ code: 'unexpected_failure', status: 500 }, 500],
]) {
  test('AUTH-10 closes its temporary session after update error ' + error.code, async (t) => {
    const fixture = authFixture(t, { updateError: error });
    await assert.rejects(service.changePassword('admin@example.invalid', ADMIN_ID, 'actual123', 'nueva123'),
      { statusCode: status });
    assert.deepEqual(fixture.calls.at(-1), ['signout', { scope: 'local' }]);
  });
}

test('AUTH-10 cleanup failure does not falsely report a successful change as failed', async (t) => {
  t.mock.method(console, 'error', () => {});
  authFixture(t, { cleanupError: { message: 'private provider detail' } });
  assert.match((await service.changePassword('admin@example.invalid', ADMIN_ID, 'actual123', 'nueva123')).mensaje,
    /actualizada/);
});

test('AUTH-10 validates required, different passwords without accepting identity fields', () => {
  for (const body of [{}, { passwordActual: 'old', passwordNueva: 'short' },
    { passwordActual: 'igual123', passwordNueva: 'igual123' },
    { passwordActual: 'old', passwordNueva: 'nueva123', id: ADMIN_ID }]) {
    assert.equal(changePasswordSchema.safeParse(body).success, false);
  }
});

test('AUTH-10 HTTP enforces authentication, schema and existing response envelope', async (t) => {
  const fixture = authFixture(t);
  const base = await servidor(t);
  const request = (token, body) => fetch(base + '/auth/password', { method: 'PATCH',
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(body) });
  const body = { passwordActual: 'anterior123', passwordNueva: 'nueva123' };
  assert.equal((await request(null, body)).status, 401);
  assert.equal((await request('invalid', body)).status, 401);
  assert.equal((await request('admin', {})).status, 400);
  assert.equal(fixture.calls.length, 0);
  const response = await request('admin', body);
  assert.equal(response.status, 200);
  assert.match((await response.json()).data.mensaje, /actualizada/);
});
