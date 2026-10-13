const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../dist/docs/data');
const { buildOpenApiSpec } = require('../dist/docs/openapi');
test('Swagger registra CAT-01..05 HOR-01..05 y PRF-01..06 con cuerpos concretos', () => {
  const spec = buildOpenApiSpec();
  const operations = Object.values(spec.paths).flatMap((path) => Object.values(path));
  for (const [prefix, count] of [['CAT',5],['HOR',6],['PRF',6]]) {
    const module = operations.filter((op) => op.operationId.startsWith(prefix+'-'));
    assert.equal(module.length, count);
    for (const op of module) assert.equal(op.summary.includes('PENDIENTE'), false);
  }
  const profesor = spec.paths['/profesores'].post.requestBody.content['application/json'].schema;
  assert.ok(profesor.required.includes('email'));
  assert.equal(profesor.properties.password.writeOnly, true);
  assert.equal(spec.paths['/profesores/{id}'].put.requestBody.content['application/json'].schema.properties.password, undefined);
  assert.equal(spec.paths['/categorias/{id}/horarios'].post.responses['201'].description, 'Creado');
});
