const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
const { servidor, ALUMNO_ID, ALUMNO_USER_ID, supabaseAdmin } = require('./helpers/alumnos-fixture.cjs');
const authRepository = require('../dist/modules/auth/auth.repository');
const authService = require('../dist/modules/auth/auth.service');
const accountRepository = require('../dist/modules/usuarios/usuarios.repository');
const { registerSchema } = require('../dist/modules/auth/auth.schema');

function fixture(t, dbError) {
  const calls = [];
  const row = { id: ALUMNO_ID, nombres: 'Ana', apellidos: 'Prueba', email: 'ana@example.invalid' };
  t.mock.method(authRepository, 'findAlumnoByDni', async () => row);
  t.mock.method(accountRepository, 'obtenerAlumnoPorId', async () => row);
  t.mock.method(accountRepository, 'alumnoTieneUsuario', async () => false);
  t.mock.method(accountRepository, 'usuarioExiste', async () => false);
  t.mock.method(accountRepository, 'crearCuentaAuth', async () => ({
    data: { user: { id: ALUMNO_USER_ID } }, error: null,
  }));
  t.mock.method(accountRepository, 'insertarUsuario', async (body) => {
    calls.push(['insert', body]);
    if (dbError) throw dbError;
  });
  t.mock.method(accountRepository, 'eliminarCuentaAuth', async (id) => calls.push(['cleanup', id]));
  return calls;
}

test('Registration keeps its public DNI contract while sharing the safe account-creation flow', async (t) => {
  const calls = fixture(t);
  const base = await servidor(t);
  const response = await fetch(base + '/auth/register', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni: '12345678', usuario: ' ana.prueba ', password: 'secreto123' }) });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: { mensaje: 'Cuenta creada correctamente. Ya puedes iniciar sesión.' } });
  assert.equal(calls[0][1].estudianteId, ALUMNO_ID);
  assert.equal(calls[0][1].usuario, 'ana.prueba');
});

test('Registration compensates unique-link or username races instead of leaving an orphan Auth account', async (t) => {
  const calls = fixture(t, { code: '23505' });
  await assert.rejects(authService.register('12345678', 'ana.prueba', 'secreto123'), { statusCode: 409 });
  assert.deepEqual(calls.at(-1), ['cleanup', ALUMNO_USER_ID]);
});

test('Registration still requires an existing student and rejects extra identity/role fields', async (t) => {
  fixture(t);
  t.mock.method(authRepository, 'findAlumnoByDni', async () => null);
  await assert.rejects(authService.register('12345678', 'ana.prueba', 'secreto123'), { statusCode: 404 });
  assert.equal(registerSchema.safeParse({ dni: '12345678', usuario: '   ', password: 'secreto123' }).success, false);
  assert.equal(registerSchema.safeParse({ dni: '12345678', usuario: 'ana', password: 'secreto123', rol: 'ADM' }).success, false);
});

test('Public registration does not expose an Auth cleanup UUID to anonymous callers', async (t) => {
  fixture(t, { code: '23505' });
  t.mock.method(console, 'error', () => {});
  t.mock.method(accountRepository, 'eliminarCuentaAuth', async () => { throw new Error('private provider detail'); });
  const base = await servidor(t);
  const response = await fetch(base + '/auth/register', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"dni":"12345678","usuario":"ana.prueba","password":"secreto123"}' });
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error.details, undefined);
  assert.equal(JSON.stringify(body).includes(ALUMNO_USER_ID), false);
  assert.equal(JSON.stringify(body).includes('private'), false);
});

test('Username availability is case-insensitive, literal, excludes the edited account and propagates SQL errors', async (t) => {
  let request;
  let fail = false;
  const client = createClient('https://cuentas.test', 'test-key', { global: { fetch: async (input) => {
    request = new URL(input);
    return new Response(JSON.stringify(fail ? { code: 'TEST_ERROR' } : [{ id: ALUMNO_USER_ID }]),
      { status: fail ? 500 : 200, headers: { 'Content-Type': 'application/json' } });
  } }, auth: { persistSession: false, autoRefreshToken: false } });
  t.mock.method(supabaseAdmin, 'from', (table) => client.from(table));
  assert.equal(await authRepository.usuarioExiste('Ana_%', ALUMNO_ID), true);
  assert.equal(request.searchParams.get('usuario'), 'ilike.Ana\\_\\%');
  assert.equal(request.searchParams.get('id'), 'neq.' + ALUMNO_ID);
  fail = true;
  await assert.rejects(authRepository.usuarioExiste('Ana'), { code: 'TEST_ERROR' });
});
