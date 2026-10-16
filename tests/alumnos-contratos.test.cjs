const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildOpenApiSpec, schemas, nuevoAlumno, repository, servidor } = require('./helpers/alumnos-fixture.cjs');

test('Swagger registra alumnos y los tres dashboards después de integrar las ramas', () => {
  const { paths } = buildOpenApiSpec();
  for (const path of ['/alumnos', '/alumnos/me/perfil', '/alumnos/me/perfil/foto',
    '/dashboard/admin', '/dashboard/profesor', '/dashboard/alumno']) {
    assert.ok(paths[path], path);
  }
});

test('contratos de creación, edición y filtros usan categoriaId igual que la API', () => {
  const { paths } = buildOpenApiSpec();
  const create = paths['/alumnos'].post.requestBody.content['application/json'].schema;
  assert.ok(create.required.includes('categoriaId'));
  assert.equal(Object.hasOwn(create.properties, 'categoria_id'), false);
  assert.deepEqual(Object.keys(create.properties).sort(), Object.keys(schemas.crearAlumnoSchema.shape).sort());
  assert.equal(schemas.crearAlumnoSchema.safeParse(nuevoAlumno).success, true);
  const update = paths['/alumnos/{id}'].put.requestBody.content['application/json'].schema;
  assert.ok(update.properties.categoriaId);
  assert.equal(Object.hasOwn(update.properties, 'estado'), false);
  assert.ok(paths['/alumnos'].get.parameters.some((parameter) => parameter.name === 'categoriaId'));
});

test('OpenAPI no duplica parámetros de ruta y conserva sus tipos explícitos', () => {
  const { paths } = buildOpenApiSpec();
  for (const operations of Object.values(paths)) {
    for (const operation of Object.values(operations)) {
      const keys = operation.parameters.map((parameter) => `${parameter.in}:${parameter.name}`);
      assert.equal(new Set(keys).size, keys.length, operation.operationId);
    }
  }
  assert.equal(paths['/alumnos/{id}'].get.parameters.find((parameter) => parameter.name === 'id').schema.format, 'uuid');
});

test('Swagger documenta envolturas reales y mantiene errores HTTP compartidos', () => {
  const { paths } = buildOpenApiSpec();
  const creation = paths['/alumnos'].post.responses;
  assert.ok(creation['201'].content['application/json'].schema.properties.data);
  assert.equal(Object.hasOwn(creation, '200'), false);
  for (const status of ['400', '401', '403', '404']) assert.ok(creation[status]);
  const profile = paths['/alumnos/me/perfil'].get.responses['200'].content['application/json'].schema;
  assert.ok(profile.properties.data.properties.categoria);
  const photo = paths['/alumnos/me/perfil/foto'].put.responses['200'].content['application/json'].schema;
  assert.ok(photo.properties.data.properties.fotoUrl);
});

test('respuesta HTTP del listado coincide con la envoltura documentada', async (t) => {
  const list = { data: [], page: 1, limit: 20, total: 0, totalPages: 0 };
  t.mock.method(repository, 'findAll', async () => list);
  const base = await servidor(t);
  const response = await fetch(`${base}/alumnos`, { headers: { Authorization: 'Bearer admin' } });
  assert.equal(response.status, 200);
  // Convención de la lista de endpoints: { data: [], meta: { page, limit, total } }.
  assert.deepEqual(await response.json(), { data: [], meta: { page: 1, limit: 20, total: 0 } });
  const documented = buildOpenApiSpec().paths['/alumnos'].get.responses['200'].content['application/json'].schema;
  assert.equal(documented.properties.data.type, 'array');
  assert.equal(documented.properties.meta.type, 'object');
});
