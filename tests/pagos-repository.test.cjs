const { test } = require('node:test');
const assert = require('node:assert/strict');
const { databaseFixture } = require('./helpers/supabase-fixture.cjs');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const { crearPagosRepository } = require('../dist/modules/pagos/pagos.repository');

const alumnos = [
  { id: 'a', nombres: 'Ana', apellidos: 'Rojas', dni: '12345678', codigo: 'A-1', estado: 'activo' },
  { id: 'b', nombres: 'Bruno', apellidos: 'Díaz', dni: '23456789', codigo: null, estado: 'activo' },
  { id: 'c', nombres: 'Camila', apellidos: 'Paz', dni: '34567890', codigo: 'C-3', estado: 'inactivo' },
];

test('PAG-01 filtra por período, estado y estudianteId mapeándolo a alumno_id', async () => {
  const fixture = databaseFixture({
    pagos: [
      { id: 'p1', alumno_id: 'a', periodo: '2026-09', estado: 'pagado' },
      { id: 'p2', alumno_id: 'a', periodo: '2026-10', estado: 'pendiente' },
      { id: 'p3', alumno_id: 'b', periodo: '2026-10', estado: 'pagado' },
    ],
  });
  const repository = crearPagosRepository(fixture.client);

  const resultado = await repository.findAll({ periodo: '2026-10', estado: 'pagado', estudianteId: 'b' });
  assert.deepEqual(resultado.map((pago) => pago.id), ['p3']);
  assert.equal(fixture.requests[0].params.get('periodo'), 'eq.2026-10');
  assert.equal(fixture.requests[0].params.get('estado'), 'eq.pagado');
  assert.equal(fixture.requests[0].params.get('alumno_id'), 'eq.b');
});

test('PAG-02 obtiene pagos solo del período y de los alumnos solicitados', async () => {
  const fixture = databaseFixture({
    pagos: [
      { id: 'periodo-correcto', alumno_id: 'a', periodo: '2026-10', estado: 'pagado' },
      { id: 'otro-periodo', alumno_id: 'a', periodo: '2026-09', estado: 'pagado' },
      { id: 'otro-alumno', alumno_id: 'c', periodo: '2026-10', estado: 'pagado' },
    ],
  });
  const repository = crearPagosRepository(fixture.client);

  const resultado = await repository.findByPeriodForStudents('2026-10', ['a', 'b']);
  assert.deepEqual(resultado.map((pago) => pago.id), ['periodo-correcto']);
  assert.deepEqual(await repository.findByPeriodForStudents('2026-10', []), []);
  assert.equal(fixture.requests.length, 1);
});

test('PAG-09 devuelve alumnos activos sin cargo para el período y no hace consultas innecesarias', async () => {
  const fixture = databaseFixture({
    alumnos,
    pagos: [{ id: 'p1', alumno_id: 'a', periodo: '2026-10', estado: 'pendiente' }],
  });
  const repository = crearPagosRepository(fixture.client);

  assert.deepEqual((await repository.findActiveStudentsWithoutPayment('2026-10')).map((alumno) => alumno.id), ['b']);
  assert.ok(fixture.requests.some((request) => request.table === 'alumnos' && request.params.get('estado') === 'eq.activo'));
  assert.ok(fixture.requests.some((request) => request.table === 'pagos' && request.params.get('periodo') === 'eq.2026-10'));

  const sinAlumnos = databaseFixture({ alumnos: [], pagos: [] });
  assert.deepEqual(await crearPagosRepository(sinAlumnos.client).findActiveStudentsWithoutPayment('2026-10'), []);
  assert.equal(sinAlumnos.requests.filter((request) => request.table === 'pagos').length, 0);
});

test('PAG-10 obtiene solo el historial del alumno en orden de período descendente', async () => {
  const fixture = databaseFixture({
    pagos: [
      { id: 'ago', alumno_id: 'a', periodo: '2026-08', estado: 'pagado' },
      { id: 'oct', alumno_id: 'a', periodo: '2026-10', estado: 'pendiente' },
      { id: 'sep', alumno_id: 'a', periodo: '2026-09', estado: 'vencido' },
      { id: 'otro', alumno_id: 'b', periodo: '2026-11', estado: 'pagado' },
    ],
  });
  const repository = crearPagosRepository(fixture.client);

  const historial = await repository.findHistoryForStudent('a');
  assert.deepEqual(historial.map((pago) => pago.id), ['oct', 'sep', 'ago']);
  assert.equal(fixture.requests[0].params.get('alumno_id'), 'eq.a');
  assert.equal(fixture.requests[0].params.get('order'), 'periodo.desc,id.asc');
});

test('PAG-11 busca por alumno y período y devuelve null si no encuentra pago', async () => {
  const fixture = databaseFixture({
    pagos: [{ id: 'p1', alumno_id: 'a', periodo: '2026-10', estado: 'pagado' }],
  });
  const repository = crearPagosRepository(fixture.client);

  assert.equal((await repository.findCurrentForStudent('a', '2026-10')).id, 'p1');
  assert.equal(await repository.findCurrentForStudent('b', '2026-10'), null);
  assert.equal(fixture.requests[0].params.get('alumno_id'), 'eq.a');
  assert.equal(fixture.requests[0].params.get('periodo'), 'eq.2026-10');
});
