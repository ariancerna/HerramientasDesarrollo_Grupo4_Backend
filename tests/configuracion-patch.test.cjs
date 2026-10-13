const { test } = require('node:test');
const assert = require('node:assert/strict');
const { servidor, supabaseAdmin, ADMIN_ID, PROFESOR_ID, ALUMNO_USER_ID, buildOpenApiSpec } =
  require('./helpers/alumnos-fixture.cjs');
const { postgresFixture } = require('./helpers/postgres-fixture.cjs');
const repository = require('../dist/modules/configuracion/configuracion.repository');
const { miConfigSchema } = require('../dist/modules/configuracion/configuracion.schema');

test('CFG-02 validates nonempty, strict preference changes and preserves false', () => {
  for (const body of [{}, null, [], { tema: 'automatico' }, { tema: null },
    { notificacionesSilenciadas: 'false' }, { notificacionesSilenciadas: null },
    { usuario_id: ADMIN_ID }, { tema: 'claro', id: ADMIN_ID }]) {
    assert.equal(miConfigSchema.safeParse(body).success, false, JSON.stringify(body));
  }
  assert.deepEqual(miConfigSchema.parse({ notificacionesSilenciadas: false }), { notificacionesSilenciadas: false });
});

test('CFG-02 repository maps only approved fields into the atomic RPC and normalizes its response', async (t) => {
  const calls = [];
  t.mock.method(supabaseAdmin, 'rpc', (name, args) => {
    calls.push({ name, args });
    return { single: async () => ({ data: { tema: 'oscuro', notificaciones_silenciadas: false }, error: null }) };
  });
  assert.deepEqual(await repository.actualizarMiConfig(ADMIN_ID, { notificacionesSilenciadas: false }),
    { tema: 'oscuro', notificacionesSilenciadas: false });
  assert.deepEqual(calls[0], { name: 'actualizar_configuracion_usuario',
    args: { p_usuario_id: ADMIN_ID, p_tema: null, p_silenciadas: false } });
});

test('CFG-02 repository propagates RPC failures and refuses unconfirmed writes', async (t) => {
  const rpc = t.mock.method(supabaseAdmin, 'rpc', () => ({ single: async () => ({
    data: null, error: { code: 'TEST_FAILURE', message: 'private detail' },
  }) }));
  await assert.rejects(repository.actualizarMiConfig(ADMIN_ID, { tema: 'claro' }), { code: 'TEST_FAILURE' });
  rpc.mock.mockImplementation(() => ({ single: async () => ({ data: null, error: null }) }));
  await assert.rejects(repository.actualizarMiConfig(ADMIN_ID, { tema: 'claro' }), { statusCode: 500 });
});

for (const [token, id] of [['admin', ADMIN_ID], ['profesor', PROFESOR_ID], ['alumno', ALUMNO_USER_ID]]) {
  test('CFG-02 HTTP updates only ' + token + ' preferences at the canonical route', async (t) => {
    const update = t.mock.method(repository, 'actualizarMiConfig', async () => ({
      tema: 'oscuro', notificacionesSilenciadas: true,
    }));
    const base = await servidor(t);
    const response = await fetch(base + '/me/configuracion', { method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema: 'oscuro' }) });
    assert.equal(response.status, 200);
    assert.deepEqual(update.mock.calls[0].arguments, [id, { tema: 'oscuro' }]);
    assert.deepEqual(await response.json(), { data: { tema: 'oscuro', notificacionesSilenciadas: true } });
  });
}

test('CFG-02 HTTP rejects unauthenticated, inactive, empty and impersonation requests before writing', async (t) => {
  const update = t.mock.method(repository, 'actualizarMiConfig', async () => ({}));
  const base = await servidor(t, { admin: { id: ADMIN_ID, rol: 'ADM' },
    inactivo: { id: ALUMNO_USER_ID, rol: 'ALU', activo: false } });
  const request = (token, body, query = '') => fetch(base + '/me/configuracion' + query, { method: 'PATCH',
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(body) });
  assert.equal((await request(null, { tema: 'oscuro' })).status, 401);
  assert.equal((await request('inactivo', { tema: 'oscuro' })).status, 403);
  assert.equal((await request('admin', {})).status, 400);
  assert.equal((await request('admin', { tema: 'oscuro', usuarioId: ALUMNO_USER_ID })).status, 400);
  assert.equal((await request('admin', { tema: 'oscuro' }, '?usuarioId=' + ALUMNO_USER_ID)).status, 400);
  assert.equal(update.mock.callCount(), 0);
});

test('CFG-02 HTTP masks write failures without pretending preferences were saved', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(repository, 'actualizarMiConfig', async () => { throw new Error('private SQL detail'); });
  const base = await servidor(t);
  const response = await fetch(base + '/me/configuracion', { method: 'PATCH',
    headers: { Authorization: 'Bearer admin', 'Content-Type': 'application/json' },
    body: '{"tema":"oscuro"}' });
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes('private'), false);
});

async function sqlFixture(t) {
  const db = await postgresFixture(t, ['configuracion_parcial_atomica.sql']);
  for (const [id, username] of [[ADMIN_ID, 'admin'], [ALUMNO_USER_ID, 'alumno']]) {
    await db.query('insert into usuarios(id,usuario,email,nombre,rol) values($1,$2,$3,$4,$5)',
      [id, username, username + '@example.invalid', username, 'ADM']);
  }
  return db;
}

test('CFG-02 SQL creates defaults, preserves omitted fields, applies false and isolates owners', async (t) => {
  const db = await sqlFixture(t);
  await db.exec('SET ROLE service_role');
  const update = (id, tema, silenciadas) => db.query('select * from actualizar_configuracion_usuario($1,$2,$3)',
    [id, tema, silenciadas]);
  assert.deepEqual((await update(ADMIN_ID, null, true)).rows[0],
    { usuario_id: ADMIN_ID, tema: 'sistema', notificaciones_silenciadas: true });
  assert.equal((await update(ADMIN_ID, 'oscuro', null)).rows[0].notificaciones_silenciadas, true);
  assert.deepEqual((await update(ADMIN_ID, null, false)).rows[0],
    { usuario_id: ADMIN_ID, tema: 'oscuro', notificaciones_silenciadas: false });
  await update(ALUMNO_USER_ID, 'claro', null);
  assert.equal((await db.query('select tema from configuraciones_usuario where usuario_id=$1', [ADMIN_ID])).rows[0].tema,
    'oscuro');
});

test('CFG-02 SQL keeps both concurrent partial updates without read/merge races', async (t) => {
  const db = await sqlFixture(t);
  await Promise.all([
    db.query('select * from actualizar_configuracion_usuario($1,$2,$3)', [ADMIN_ID, 'oscuro', null]),
    db.query('select * from actualizar_configuracion_usuario($1,$2,$3)', [ADMIN_ID, null, true]),
  ]);
  const row = (await db.query('select * from configuraciones_usuario where usuario_id=$1', [ADMIN_ID])).rows[0];
  assert.equal(row.tema, 'oscuro');
  assert.equal(row.notificaciones_silenciadas, true);
});

test('CFG-02 SQL validates constraints and denies RPC to public roles', async (t) => {
  const db = await sqlFixture(t);
  await assert.rejects(db.query('select * from actualizar_configuracion_usuario($1,$2,$3)', [ADMIN_ID, 'invalid', null]),
    { code: '23514' });
  await assert.rejects(db.query('select * from actualizar_configuracion_usuario($1,$2,$3)', [ADMIN_ID, null, null]),
    { code: '22023' });
  for (const role of ['anon', 'authenticated']) {
    const result = await db.query('select has_function_privilege($1,$2,$3) as allowed',
      [role, 'public.actualizar_configuracion_usuario(uuid,text,boolean)', 'EXECUTE']);
    assert.equal(result.rows[0].allowed, false);
  }
});

test('CFG-02 Swagger documents the strict partial body and normalized GET-compatible response', () => {
  const operation = buildOpenApiSpec().paths['/me/configuracion'].patch;
  assert.equal(operation.operationId, 'CFG-02');
  const schema = operation.requestBody.content['application/json'].schema;
  assert.equal(schema.minProperties, 1);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(Object.keys(schema.properties), ['tema', 'notificacionesSilenciadas']);
});
