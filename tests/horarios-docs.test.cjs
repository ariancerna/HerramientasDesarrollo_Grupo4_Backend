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

test('HOR-04 documents a required, strict, partial body and the saved DTO', () => {
  const operation = buildOpenApiSpec().paths['/categorias/{id}/horarios/{horarioId}'].patch;
  assert.equal(operation.operationId, 'HOR-04');
  assert.match(operation.description, /ADM/);
  assert.equal(operation.summary.includes('PENDIENTE'), false);
  assert.ok(operation.parameters.every((parameter) => parameter.schema.format === 'uuid'));
  assert.equal(operation.requestBody.required, true);
  const schema = operation.requestBody.content['application/json'].schema;
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.minProperties, 1);
  assert.equal(schema.required, undefined);
  assert.deepEqual(Object.keys(schema.properties), ['dia', 'horaInicio', 'horaFin', 'cancha', 'estado']);
  assert.deepEqual(schema.properties.estado.enum, ['activo', 'cancelado']);
  assert.equal(schema.properties.cancha.nullable, true);
  assert.equal(schema.properties.cancha.maxLength, 200);
  const response = operation.responses['200'].content['application/json'].schema;
  assert.ok(response.properties.data.required.includes('horaInicio'));
  assert.equal(response.properties.data.properties.cancha.nullable, true);
  for (const code of ['400', '401', '403', '404', '413', '500']) {
    assert.ok(operation.responses[code]);
  }
});

test('Custom schedule documentation preserves defaults for existing endpoints', () => {
  const spec = buildOpenApiSpec();
  assert.ok(spec.paths['/sedes'].get.responses['200']);
  assert.ok(spec.paths['/sedes'].post.requestBody.content['application/json'].schema);
});
