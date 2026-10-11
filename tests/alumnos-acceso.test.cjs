const { test } = require('node:test');
const assert = require('node:assert/strict');
const { repository, service, profesor, admin, alumno, ALUMNO_ID, CATEGORIA_ID,
  OTRA_CATEGORIA_ID, servidor } = require('./helpers/alumnos-fixture.cjs');

test('profesor solo puede consultar por ID alumnos de sus categorías asignadas', async (t) => {
  t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  const found = { id: ALUMNO_ID, categoria_id: CATEGORIA_ID };
  t.mock.method(repository, 'findById', async () => found);
  assert.equal((await service.getById(profesor, ALUMNO_ID)).id, ALUMNO_ID);
  for (const categoriaId of [OTRA_CATEGORIA_ID, null]) {
    found.categoria_id = categoriaId;
    await assert.rejects(service.getById(profesor, ALUMNO_ID), { statusCode: 403 });
  }
});

test('búsqueda por DNI aplica el mismo alcance del profesor que el detalle', async (t) => {
  t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  const found = { id: ALUMNO_ID, categoria_id: CATEGORIA_ID };
  t.mock.method(repository, 'findByDni', async () => found);
  assert.equal((await service.getByDni(profesor, '12345678')).id, ALUMNO_ID);
  found.categoria_id = OTRA_CATEGORIA_ID;
  await assert.rejects(service.getByDni(profesor, '12345678'), { statusCode: 403 });
});

test('sin categorías el profesor no obtiene detalles, y los errores no se ocultan', async (t) => {
  t.mock.method(repository, 'findById', async () => ({ id: ALUMNO_ID, categoria_id: CATEGORIA_ID }));
  const assignments = t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => []);
  await assert.rejects(service.getById(profesor, ALUMNO_ID), { statusCode: 403 });
  assignments.mock.mockImplementation(async () => { throw Error('Error consultando categorías'); });
  await assert.rejects(service.getById(profesor, ALUMNO_ID), /Error consultando categorías/);
});

test('administrador conserva acceso y el alumno solo puede leer su propio detalle', async (t) => {
  const found = { id: ALUMNO_ID, categoria_id: OTRA_CATEGORIA_ID };
  t.mock.method(repository, 'findById', async () => found);
  assert.equal((await service.getById(admin, ALUMNO_ID)).id, ALUMNO_ID);
  assert.equal((await service.getById(alumno, ALUMNO_ID)).id, ALUMNO_ID);
  found.id = 'otro-alumno';
  await assert.rejects(service.getById(alumno, 'otro-alumno'), { statusCode: 403 });
});

test('HTTP: detalle y DNI rechazan accesos del profesor fuera de su categoría', async (t) => {
  t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  const found = { id: ALUMNO_ID, categoria_id: CATEGORIA_ID };
  t.mock.method(repository, 'findById', async () => found);
  t.mock.method(repository, 'findByDni', async () => found);
  const base = await servidor(t);
  const paths = [`/alumnos/${ALUMNO_ID}`, '/alumnos/dni/12345678'];
  for (const path of paths) {
    assert.equal((await fetch(`${base}${path}`, { headers: { Authorization: 'Bearer profesor' } })).status, 200);
  }
  found.categoria_id = OTRA_CATEGORIA_ID;
  for (const path of paths) {
    assert.equal((await fetch(`${base}${path}`, { headers: { Authorization: 'Bearer profesor' } })).status, 403);
  }
  assert.equal((await fetch(`${base}/alumnos/${ALUMNO_ID}`)).status, 401);
  assert.equal((await fetch(`${base}/alumnos/dni/12345678`, { headers: { Authorization: 'Bearer alumno' } })).status, 403);
});
