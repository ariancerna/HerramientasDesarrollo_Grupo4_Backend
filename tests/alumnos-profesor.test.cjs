const { test } = require('node:test');
const assert = require('node:assert/strict');
const { repository, service, alumno, PROFESOR_ID, ALUMNO_ID, CATEGORIA_ID,
  OTRA_CATEGORIA_ID, servidor } = require('./helpers/alumnos-fixture.cjs');

const sinVinculoExplicito = { id: PROFESOR_ID, rol: 'PROF' };
const alumnoRow = { id: ALUMNO_ID, categoria_id: CATEGORIA_ID };

test('listado usa el ID de Auth cuando profesor_id no está definido', async (t) => {
  const assignments = t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  const list = t.mock.method(repository, 'findAll', async (filters) => ({ data: [alumnoRow], total: 1, ...filters }));
  await service.list(sinVinculoExplicito, { profesorId: 'identidad-ajena', page: '1', limit: '10' });
  assert.equal(assignments.mock.calls[0].arguments[0], PROFESOR_ID);
  assert.deepEqual(list.mock.calls[0].arguments[0].categoriaIds, [CATEGORIA_ID]);
  assert.equal(list.mock.calls[0].arguments[0].limit, 10);
});

test('detalle y DNI resuelven la misma identidad de profesor que el listado', async (t) => {
  const assignments = t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  t.mock.method(repository, 'findById', async () => alumnoRow);
  t.mock.method(repository, 'findByDni', async () => alumnoRow);
  await service.getById(sinVinculoExplicito, ALUMNO_ID);
  await service.getByDni(sinVinculoExplicito, '12345678');
  assert.deepEqual(assignments.mock.calls.map((call) => call.arguments[0]), [PROFESOR_ID, PROFESOR_ID]);
});

test('si existe profesor_id se utiliza ese vínculo en vez del ID de Auth', async (t) => {
  const assignments = t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  t.mock.method(repository, 'findAll', async () => ({ data: [] }));
  await service.list({ ...sinVinculoExplicito, profesorId: 'perfil-docente-vinculado' }, {});
  assert.equal(assignments.mock.calls[0].arguments[0], 'perfil-docente-vinculado');
});

test('sin asignaciones el listado queda vacío y nunca consulta todos los alumnos', async (t) => {
  t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => []);
  const list = t.mock.method(repository, 'findAll', async () => { throw Error('No debe listar'); });
  assert.deepEqual(await service.list(sinVinculoExplicito, {}), {
    data: [], page: 1, limit: 20, total: 0, totalPages: 0,
  });
  await assert.rejects(service.list(alumno, {}), { statusCode: 403 });
  assert.equal(list.mock.callCount(), 0);
});

test('la categoría solicitada no elimina la restricción a categorías asignadas', async (t) => {
  t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  const list = t.mock.method(repository, 'findAll', async () => ({ data: [] }));
  await service.list(sinVinculoExplicito, { categoriaId: OTRA_CATEGORIA_ID });
  const filters = list.mock.calls[0].arguments[0];
  assert.equal(filters.categoriaId, OTRA_CATEGORIA_ID);
  assert.deepEqual(filters.categoriaIds, [CATEGORIA_ID]);
});

test('HTTP: profesor sin vínculo explícito consulta listado, detalle y DNI con su identidad', async (t) => {
  t.mock.method(repository, 'findCategoriaIdsByProfesor', async (id) => id === PROFESOR_ID ? [CATEGORIA_ID] : []);
  t.mock.method(repository, 'findAll', async () => ({ data: [alumnoRow], page: 1, limit: 20, total: 1, totalPages: 1 }));
  t.mock.method(repository, 'findById', async () => alumnoRow);
  t.mock.method(repository, 'findByDni', async () => alumnoRow);
  const base = await servidor(t, { profesorSinVinculo: sinVinculoExplicito });
  for (const path of ['/alumnos', `/alumnos/${ALUMNO_ID}`, '/alumnos/dni/12345678']) {
    const response = await fetch(`${base}${path}`, { headers: { Authorization: 'Bearer profesorSinVinculo' } });
    assert.equal(response.status, 200);
  }
});
