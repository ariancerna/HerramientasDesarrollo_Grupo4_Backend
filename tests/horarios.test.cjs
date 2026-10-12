const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
const schema = require('../dist/modules/horarios/horarios.schema');
const repo = require('../dist/modules/horarios/horarios.repository');
const categorias = require('../dist/modules/categorias/categorias.service');
const service = require('../dist/modules/horarios/horarios.service');
const { supabaseAdmin } = require('../dist/config/supabase');
const { databaseFixture } = require('./helpers/supabase-fixture.cjs');
const cat = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const body = { dia: 'lunes', horaInicio: '09:00', horaFin: '11:00' };
test('HOR valida dias, horas reales, duracion y cambios no vacios', () => {
  assert.equal(schema.crearHorarioSchema.parse({ ...body, dia: 'Lunes' }).dia, 'lunes');
  for (const dia of ['mi\u00e9rcoles', 's\u00e1bado']) assert.equal(schema.crearHorarioSchema.parse({ ...body, dia }).dia, dia);
  for (const changes of [{ dia: 'feriado' }, { horaInicio: '24:00' }, { horaFin: '09:00' }, { horaFin: '08:59' }, { horaFin: '9:60' }]) {
    assert.equal(schema.crearHorarioSchema.safeParse({ ...body, ...changes }).success, false);
  }
  assert.equal(schema.actualizarHorarioSchema.safeParse({}).success, false);
  assert.equal(schema.actualizarHorarioSchema.safeParse({ estado: 'cancelado' }).success, true);
});
test('HOR valida actualizaciones parciales contra horas actuales y evita duplicar dia', async (t) => {
  t.mock.method(categorias, 'getById', async () => ({ id: cat }));
  t.mock.method(repo, 'findById', async () => ({ id, ...body }));
  t.mock.method(repo, 'findAll', async () => [{ id, ...body }]);
  t.mock.method(repo, 'update', async (_cat, _id, changes) => ({ id, ...body, ...changes }));
  await assert.rejects(service.update(cat, id, { horaInicio: '12:00' }), { statusCode: 400 });
  await assert.rejects(service.create(cat, { ...body, estado: 'activo' }), { statusCode: 409 });
  assert.equal((await service.update(cat, id, { estado: 'cancelado' })).estado, 'cancelado');
});
test('HOR nunca lee ni elimina un horario de otra categoria', async (t) => {
  const fixture = databaseFixture({ horarios: [{ id, categoria_id: cat, dia: 'Lunes', hora_inicio: '09:00:00', hora_fin: '11:00:00', estado: 'activo' }] });
  t.mock.method(supabaseAdmin, 'from', (table) => fixture.client.from(table));
  assert.equal(await repo.findById(id, id), null);
  assert.equal(await repo.remove(id, id), null);
  assert.equal((await repo.findById(cat, id)).horaInicio, '09:00');
  for (const request of fixture.requests) {
    assert.ok(request.params.get('categoria_id'));
    assert.ok(request.params.get('id'));
  }
});
