const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildOpenApiSpec } = require('./helpers/alumnos-fixture.cjs');

test('Swagger contains all six requested tasks with unique operation IDs and concrete success responses', () => {
  const spec = buildOpenApiSpec();
  for (const [id, method, path, status] of [
    ['AUTH-10', 'patch', '/auth/password', '200'],
    ['USR-01', 'post', '/alumnos/{id}/cuenta', '201'],
    ['SED-02', 'get', '/sedes/{id}', '200'],
    ['ALU-01', 'get', '/alumnos', '200'],
    ['CFG-01', 'get', '/me/configuracion', '200'],
    ['CFG-02', 'patch', '/me/configuracion', '200'],
  ]) {
    const operation = spec.paths[path][method];
    assert.equal(operation.operationId, id);
    assert.equal(operation.summary.includes('PENDIENTE'), false);
    assert.ok(operation.responses[status].content['application/json'].schema.properties.data);
    for (const code of ['400', '401', '403', '404']) assert.ok(operation.responses[code]);
    if (method === 'patch' || method === 'post') {
      assert.equal(operation.requestBody.required, true);
      assert.equal(operation.requestBody.content['application/json'].schema.additionalProperties, false);
    }
  }
  const ids = Object.values(spec.paths).flatMap((path) => Object.values(path)).map((operation) => operation.operationId);
  assert.equal(new Set(ids).size, ids.length);
});
