const { test } = require('node:test');
const assert = require('node:assert/strict');
const { repository, service, schemas, admin, nuevoAlumno, ALUMNO_ID, CATEGORIA_ID,
  mockCreateLookups, servidor } = require('./helpers/alumnos-fixture.cjs');

test('crear alumno convierte categoriaId sin enviar campos ajenos a la tabla', async (t) => {
  mockCreateLookups(t);
  const insert = t.mock.method(repository, 'create', async (payload) => ({ ...payload, id: ALUMNO_ID }));
  await service.create(admin, { ...schemas.crearAlumnoSchema.parse(nuevoAlumno), campoAjeno: 'no insertar' });
  const payload = insert.mock.calls[0].arguments[0];
  assert.deepEqual(Object.keys(payload).sort(), [
    'dni', 'nombres', 'apellidos', 'codigo', 'email', 'telefono', 'categoria_id', 'estado',
  ].sort());
  assert.equal(payload.categoria_id, CATEGORIA_ID);
  assert.equal(payload.telefono, null);
  assert.equal(payload.estado, 'activo');
});

test('HTTP: administrador crea un alumno con el contrato validado y recibe 201', async (t) => {
  mockCreateLookups(t);
  t.mock.method(repository, 'create', async (payload) => ({ ...payload, id: ALUMNO_ID }));
  const base = await servidor(t);
  const response = await fetch(`${base}/alumnos`, { method: 'POST',
    headers: { Authorization: 'Bearer admin', 'Content-Type': 'application/json' },
    body: JSON.stringify(nuevoAlumno),
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.data.id, ALUMNO_ID);
  // Respuestas en camelCase (convención del contrato v1).
  assert.equal(body.data.categoriaId, CATEGORIA_ID);
  assert.equal(Object.hasOwn(body.data, 'categoria_id'), false);
});

test('HTTP: datos inválidos y roles no autorizados no crean alumnos', async (t) => {
  const insert = t.mock.method(repository, 'create', async () => { throw Error('No debe insertar'); });
  const base = await servidor(t);
  const request = (token, payload) => fetch(`${base}/alumnos`, { method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal((await request('admin', { ...nuevoAlumno, dni: '123' })).status, 400);
  assert.equal((await request('profesor', nuevoAlumno)).status, 403);
  assert.equal((await request('alumno', nuevoAlumno)).status, 403);
  assert.equal(insert.mock.callCount(), 0);
});
