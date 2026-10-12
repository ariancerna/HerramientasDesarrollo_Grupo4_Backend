const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
const schema = require('../dist/modules/profesores/profesores.schema');
const repo = require('../dist/modules/profesores/profesores.repository');
const service = require('../dist/modules/profesores/profesores.service');
const id = '11111111-1111-4111-8111-111111111111';
const body = { nombre: 'Profesor', usuario: 'profe', email: 'profe@example.invalid', password: 'secreto', sedeId: id };
test('PRF valida credenciales, sede, categorias unicas y campos editables', () => {
  assert.equal(schema.crearProfesorSchema.parse({ ...body, usuario: ' Profe ' }).usuario, 'profe');
  for (const changes of [{ email: 'mal' }, { password: '123' }, { sedeId: 'mal' }, { categoriaIds: [id, id] }, { usuario: 'a,b' }]) {
    assert.equal(schema.crearProfesorSchema.safeParse({ ...body, ...changes }).success, false);
  }
  assert.equal(schema.actualizarProfesorSchema.safeParse({}).success, false);
  assert.equal(schema.actualizarProfesorSchema.safeParse({ password: 'secreto' }).success, false);
  assert.equal(schema.asignarCategoriasSchema.safeParse({ categoriaIds: [] }).success, true);
});
test('PRF revierte cuenta Auth si falla la transaccion de creacion', async (t) => {
  t.mock.method(repo, 'sedeExiste', async () => true);
  t.mock.method(repo, 'usuarioExiste', async () => false);
  t.mock.method(repo, 'crearAuth', async () => ({ data: { user: { id } }, error: null }));
  t.mock.method(repo, 'create', async () => { throw { code: '23503' }; });
  const deleted = [];
  t.mock.method(repo, 'eliminarAuth', async (value) => deleted.push(value));
  await assert.rejects(service.create(schema.crearProfesorSchema.parse(body)), { statusCode: 400 });
  assert.deepEqual(deleted, [id]);
});
test('PRF informa limpieza manual si falla rollback Auth', async (t) => {
  t.mock.method(repo, 'sedeExiste', async () => true);
  t.mock.method(repo, 'usuarioExiste', async () => false);
  t.mock.method(repo, 'crearAuth', async () => ({ data: { user: { id } }, error: null }));
  t.mock.method(repo, 'create', async () => { throw { code: '23505' }; });
  t.mock.method(repo, 'eliminarAuth', async () => { throw new Error('Auth offline'); });
  await assert.rejects(service.create(schema.crearProfesorSchema.parse(body)), { statusCode: 500, code: 'AUTH_CLEANUP_REQUIRED', details: { authUserId: id } });
});
test('PRF no elimina Auth si el perfil no existe o tiene referencias', async (t) => {
  const deleted = [];
  t.mock.method(repo, 'eliminarAuth', async (value) => deleted.push(value));
  t.mock.method(repo, 'remove', async () => false);
  await assert.rejects(service.remove(id), { statusCode: 404 });
  repo.remove = async () => { throw { code: '23503' }; };
  await assert.rejects(service.remove(id), { statusCode: 409 });
  assert.deepEqual(deleted, []);
});
test('PRF permite reintentar limpieza Auth y completa la cola solo tras exito', async (t) => {
  const complete = [];
  t.mock.method(repo, 'remove', async () => true);
  t.mock.method(repo, 'eliminarAuth', async () => { throw new Error('Auth offline'); });
  t.mock.method(repo, 'completarEliminacion', async (value) => complete.push(value));
  await assert.rejects(service.remove(id), { statusCode: 500 });
  assert.deepEqual(complete, []);
  repo.eliminarAuth = async () => {};
  await service.remove(id);
  assert.deepEqual(complete, [id]);
});
test('PRF respuestas excluyen password y metadatos de Auth', () => {
  const result = repo.presentProfesor({ id, nombre: 'Profesor', sede_id: id, usuarios: [{ rol: 'PROF', usuario: 'profe', email: body.email, password: 'NO_DEVOLVER' }], profesores_categorias: [{ categoria_id: id }] });
  assert.equal(result.password, undefined);
  assert.deepEqual(result.categoriaIds, [id]);
});
