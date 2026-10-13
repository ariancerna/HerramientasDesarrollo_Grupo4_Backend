const { test } = require('node:test');
const assert = require('node:assert/strict');
const { servidor, ALUMNO_ID, ALUMNO_USER_ID } = require('./helpers/alumnos-fixture.cjs');
const repository = require('../dist/modules/usuarios/usuarios.repository');
const service = require('../dist/modules/usuarios/usuarios.service');
const { postgresFixture } = require('./helpers/postgres-fixture.cjs');

function fixture(t, options = {}) {
  const calls = [];
  t.mock.method(repository, 'obtenerAlumnoPorId', async () => options.missing ? null : {
    id: ALUMNO_ID, nombres: 'Ana', apellidos: 'Prueba',
    email: options.noEmail ? null : 'ana@example.invalid',
  });
  t.mock.method(repository, 'alumnoTieneUsuario', async () => Boolean(options.linked));
  t.mock.method(repository, 'usuarioExiste', async () => Boolean(options.taken));
  t.mock.method(repository, 'crearCuentaAuth', async (...args) => {
    calls.push(['auth', ...args]);
    return { data: { user: { id: ALUMNO_USER_ID } }, error: options.authError ?? null };
  });
  t.mock.method(repository, 'insertarUsuario', async (body) => {
    calls.push(['insert', body]);
    if (options.dbError) throw options.dbError;
  });
  t.mock.method(repository, 'eliminarCuentaAuth', async (id) => {
    calls.push(['cleanup', id]);
    if (options.cleanupError) throw options.cleanupError;
  });
  return calls;
}

test('USR-01 creates and links only the existing student without returning credentials', async (t) => {
  const calls = fixture(t);
  const result = await service.crearCuentaParaAlumno(ALUMNO_ID, 'ana.prueba', 'secreto123');
  assert.deepEqual(calls[1][1], { id: ALUMNO_USER_ID, usuario: 'ana.prueba',
    email: 'ana@example.invalid', nombre: 'Ana Prueba', estudianteId: ALUMNO_ID });
  assert.match(result.mensaje, /creada/);
  assert.equal(JSON.stringify(result).includes('secreto123'), false);
  assert.equal(calls.some(([method]) => method === 'cleanup'), false);
});

for (const [options, status] of [
  [{ missing: true }, 404], [{ linked: true }, 409], [{ taken: true }, 409], [{ noEmail: true }, 400],
]) {
  test('USR-01 rejects invalid preconditions before creating Auth ' + JSON.stringify(options), async (t) => {
    const calls = fixture(t, options);
    await assert.rejects(service.crearCuentaParaAlumno(ALUMNO_ID, 'ana', 'secreto123'), { statusCode: status });
    assert.equal(calls.length, 0);
  });
}

for (const [code, status] of [['23505', 409], ['P0002', 404], ['23503', 404], ['P0001', 400]]) {
  test('USR-01 compensates a failed SQL transaction ' + code + ' by deleting only its new Auth user', async (t) => {
    const calls = fixture(t, { dbError: { code, message: 'private detail' } });
    await assert.rejects(service.crearCuentaParaAlumno(ALUMNO_ID, 'ana', 'secreto123'), { statusCode: status });
    assert.deepEqual(calls.at(-1), ['cleanup', ALUMNO_USER_ID]);
  });
}

test('USR-01 reports the newly created Auth UUID when administrative cleanup is required', async (t) => {
  fixture(t, { dbError: { code: '23505' }, cleanupError: new Error('private') });
  await assert.rejects(service.crearCuentaParaAlumno(ALUMNO_ID, 'ana', 'secreto123'), (error) => {
    assert.equal(error.code, 'AUTH_CLEANUP_REQUIRED');
    assert.deepEqual(error.details, { authUserId: ALUMNO_USER_ID });
    assert.equal(error.message.includes('private'), false);
    return true;
  });
});

for (const [code, status] of [['email_exists', 409], ['weak_password', 400], ['unexpected_failure', 500]]) {
  test('USR-01 handles Auth provider failure ' + code + ' without SQL writes or cleanup of other accounts', async (t) => {
    const calls = fixture(t, { authError: { code, message: 'private detail' } });
    await assert.rejects(service.crearCuentaParaAlumno(ALUMNO_ID, 'ana', 'secreto123'), { statusCode: status });
    assert.equal(calls.length, 1);
  });
}

test('USR-01 HTTP validates ADM, UUID, strict body and returns 201', async (t) => {
  const calls = fixture(t);
  const base = await servidor(t);
  const request = (token, id = ALUMNO_ID, body = { usuario: ' ana.prueba ', password: 'secreto123' }) =>
    fetch(base + '/alumnos/' + id + '/cuenta', { method: 'POST',
      headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' },
      body: JSON.stringify(body) });
  assert.equal((await request(null)).status, 401);
  assert.equal((await request('alumno')).status, 403);
  assert.equal((await request('profesor')).status, 403);
  assert.equal((await request('admin', 'bad-id')).status, 400);
  assert.equal((await request('admin', ALUMNO_ID, { usuario: 'ana', password: 'secreto123', rol: 'ADM' })).status, 400);
  assert.equal(calls.length, 0);
  const response = await request('admin');
  assert.equal(response.status, 201);
  assert.equal(calls[1][1].usuario, 'ana.prueba');
});

test('USR-01 SQL enforces one account per student, case-insensitive usernames and rollback', async (t) => {
  const db = await postgresFixture(t, ['cuenta_alumno_atomica.sql']);
  await db.query('insert into alumnos (id,dni,nombres,apellidos,email) values ($1,$2,$3,$4,$5)',
    [ALUMNO_ID, '12345678', 'Ana', 'Prueba', 'ana@example.invalid']);
  await db.exec('SET ROLE service_role');
  const args = [ALUMNO_USER_ID, ALUMNO_ID, 'Ana.Prueba', 'ana@example.invalid'];
  await db.query('select crear_cuenta_alumno($1,$2,$3,$4)', args);
  const otherId = '77777777-7777-4777-8777-777777777777';
  await assert.rejects(db.query('select crear_cuenta_alumno($1,$2,$3,$4)',
    [otherId, ALUMNO_ID, 'otro.usuario', 'ana@example.invalid']), { code: '23505' });
  assert.equal((await db.query('select count(*)::int as n from usuarios')).rows[0].n, 1);
  await db.exec('RESET ROLE');
  await assert.rejects(db.query('insert into usuarios(id,usuario,email,nombre,rol) values($1,$2,$3,$4,$5)',
    [otherId, 'ana.prueba', 'other@example.invalid', 'Otro', 'ADM']), { code: '23505' });
});

test('USR-01 SQL rejects stale email and missing students and denies public RPC access', async (t) => {
  const db = await postgresFixture(t, ['cuenta_alumno_atomica.sql']);
  await db.query('insert into alumnos(id,dni,nombres,apellidos,email) values($1,$2,$3,$4,$5)',
    [ALUMNO_ID, '12345678', 'Ana', 'Prueba', 'ana@example.invalid']);
  await assert.rejects(db.query('select crear_cuenta_alumno($1,$2,$3,$4)',
    [ALUMNO_USER_ID, ALUMNO_ID, 'ana', 'stale@example.invalid']), { code: 'P0001' });
  await assert.rejects(db.query('select crear_cuenta_alumno($1,$2,$3,$4)',
    [ALUMNO_USER_ID, ALUMNO_USER_ID, 'ana', 'ana@example.invalid']), { code: 'P0002' });
  const signature = 'public.crear_cuenta_alumno(uuid,uuid,text,text)';
  for (const role of ['anon', 'authenticated']) {
    const result = await db.query('select has_function_privilege($1,$2,$3) as allowed',
      [role, signature, 'EXECUTE']);
    assert.equal(result.rows[0].allowed, false);
  }
  assert.equal((await db.query('select count(*)::int as n from usuarios')).rows[0].n, 0);
});
