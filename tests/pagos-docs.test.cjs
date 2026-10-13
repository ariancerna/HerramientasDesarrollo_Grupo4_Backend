const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

require('../dist/docs/data');
const { buildOpenApiSpec } = require('../dist/docs/openapi');

test('Swagger documenta los once endpoints PAG con métodos, rutas y permisos correctos', () => {
  const { paths } = buildOpenApiSpec();
  const endpoints = [
    ['/pagos', 'get', 'PAG-01', 'ADM'],
    ['/pagos/estado-mensual', 'get', 'PAG-02', 'ADM'],
    ['/pagos', 'post', 'PAG-03', 'ADM'],
    ['/pagos/{id}', 'patch', 'PAG-04', 'ADM'],
    ['/pagos/{id}/registrar', 'post', 'PAG-05', 'ADM'],
    ['/pagos/registrar', 'post', 'PAG-06', 'ADM'],
    ['/pagos/{id}/marcar-pendiente', 'post', 'PAG-07', 'ADM'],
    ['/pagos/{id}', 'delete', 'PAG-08', 'ADM'],
    ['/pagos/generar-mensualidad', 'post', 'PAG-09', 'ADM'],
    ['/me/pagos', 'get', 'PAG-10', 'ALU'],
    ['/me/pagos/actual', 'get', 'PAG-11', 'ALU'],
  ];

  for (const [ruta, metodo, id, rol] of endpoints) {
    const operacion = paths[ruta]?.[metodo];
    assert.ok(operacion, `Debe documentar ${metodo.toUpperCase()} ${ruta}`);
    assert.equal(operacion.operationId, id);
    assert.ok(operacion.description.includes(`**Acceso:** ${rol}`));
    assert.ok(operacion.responses['400']);
    assert.ok(operacion.responses['401']);
    assert.ok(operacion.responses['403']);
  }
});

test('Swagger documenta parámetros, cuerpos y errores específicos del contrato de pagos', () => {
  const { paths } = buildOpenApiSpec();

  assert.deepEqual(
    paths['/pagos'].get.parameters.map((parameter) => parameter.name),
    ['periodo', 'estado', 'estudianteId'],
  );
  assert.deepEqual(
    paths['/pagos/estado-mensual'].get.parameters.map((parameter) => parameter.name),
    ['periodo', 'texto', 'filtro'],
  );
  assert.deepEqual(
    paths['/pagos/estado-mensual'].get.parameters[2].schema.enum,
    ['todos', 'alDia', 'porPagar'],
  );
  assert.equal(paths['/pagos'].post.responses['409'].description, 'Ya existe un cargo para ese alumno y período');
  assert.ok(paths['/pagos/{id}'].patch.responses['404']);
  assert.ok(paths['/pagos/{id}'].delete.responses['204']);
  assert.ok(paths['/pagos/registrar'].post.responses['200']);
  assert.ok(paths['/pagos/registrar'].post.responses['201']);
  assert.ok(paths['/pagos/generar-mensualidad'].post.responses['200']);
  assert.ok(paths['/pagos/generar-mensualidad'].post.responses['201']);
  assert.equal(paths['/me/pagos/actual'].get.responses['200'].content['application/json'].schema.properties.data.nullable, true);

  for (const ruta of ['/pagos/{id}', '/pagos/{id}/registrar', '/pagos/{id}/marcar-pendiente']) {
    for (const operacion of Object.values(paths[ruta])) {
      const id = operacion.parameters.find((parameter) => parameter.in === 'path' && parameter.name === 'id');
      assert.equal(id.required, true);
      assert.equal(id.schema.format, 'uuid');
    }
  }
});
