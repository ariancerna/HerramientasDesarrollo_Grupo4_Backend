const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers/horarios-fixture.cjs');
require('../dist/docs/data');
const { buildOpenApiSpec } = require('../dist/docs/openapi');

test('HOR-03 documents UUID paths, admin access and empty 204 instead of 200', () => {
  const operation = buildOpenApiSpec().paths['/categorias/{id}/horarios/{horarioId}'].delete;
  assert.equal(operation.operationId, 'HOR-03');
  assert.match(operation.description, /ADM/);
  assert.equal(operation.summary.includes('PENDIENTE'), false);
  assert.equal(operation.parameters.length, 2);
  assert.ok(operation.parameters.every((parameter) =>
    parameter.in === 'path' && parameter.required && parameter.schema.format === 'uuid'));
  assert.ok(operation.responses['204']);
  assert.equal(operation.responses['200'], undefined);
  for (const code of ['400', '401', '403', '404', '409', '500']) {
    assert.ok(operation.responses[code]);
  }
  assert.equal(operation.requestBody, undefined);
});
