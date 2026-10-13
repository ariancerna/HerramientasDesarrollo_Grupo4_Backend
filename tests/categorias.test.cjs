const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
const schema = require('../dist/modules/categorias/categorias.schema');
const repo = require('../dist/modules/categorias/categorias.repository');
const service = require('../dist/modules/categorias/categorias.service');
const { supabaseAdmin } = require('../dist/config/supabase');
const { createClient } = require('@supabase/supabase-js');
const id = '11111111-1111-4111-8111-111111111111';
test('CAT valida nombres, UUID, filtros y actualizaciones no vacias', () => {
  assert.equal(schema.crearCategoriaSchema.parse({ nombre: ' Sub-12 ' }).nombre, 'Sub-12');
  for (const body of [{}, { nombre: ' ' }, { nombre: 'ab' }, { nombre: 'Sub-12', profesorIds: [id] }]) {
    assert.equal(schema.crearCategoriaSchema.safeParse(body).success, false);
  }
  assert.equal(schema.actualizarCategoriaSchema.safeParse({}).success, false);
  assert.equal(schema.categoriaParamsSchema.safeParse({ id: 'mal' }).success, false);
  assert.equal(schema.categoriasQuerySchema.safeParse({ texto: ['a', 'b'] }).success, false);
});
test('CAT devuelve 404 y traduce relaciones bloqueantes a 409', async (t) => {
  t.mock.method(repo, 'findById', async () => null);
  t.mock.method(repo, 'update', async () => null);
  t.mock.method(repo, 'remove', async () => null);
  await assert.rejects(service.getById(id), { statusCode: 404 });
  await assert.rejects(service.update(id, { nombre: 'Sub-14' }), { statusCode: 404 });
  await assert.rejects(service.remove(id), { statusCode: 404 });
  repo.remove = async () => { throw { code: '23503' }; };
  await assert.rejects(service.remove(id), { statusCode: 409 });
});
test('CAT consulta relaciones y devuelve campos compatibles con el frontend', async (t) => {
  const requests = [];
  const row = { id, nombre: 'Sub-12', descripcion: null,
    profesores_categorias: [{ profesor_id: id }],
    horarios: [{ id, dia: 'Lunes', hora_inicio: '09:00:00', hora_fin: '11:00:00', estado: 'activo', cancha: null }] };
  const client = createClient('https://club.test', 'test', { global: { fetch: async (input) => {
    const url = new URL(input); requests.push(url);
    return new Response(JSON.stringify([row]), { headers: { 'Content-Type': 'application/json' } });
  } } });
  t.mock.method(supabaseAdmin, 'from', (table) => client.from(table));
  const result = await repo.findAll({ texto: 'Sub_%' });
  assert.deepEqual(result[0].profesorIds, [id]);
  assert.equal(result[0].horarios[0].horaInicio, '09:00');
  assert.equal(result[0].horarios[0].dia, 'lunes');
  assert.equal(requests[0].searchParams.get('select'), '*,horarios(*),profesores_categorias(profesor_id)');
  assert.equal(requests[0].searchParams.get('nombre'), 'ilike.%Sub\\_\\%%');
});

test('CAT muestra horarios en orden semanal independiente del orden de PostgREST', () => {
  const make = (id, dia, hora) => ({ id, dia, hora_inicio: hora, hora_fin: '23:00:00', estado: 'activo' });
  const rows = [
    make('domingo', 'Domingo', '09:00:00'),
    make('lunes-tarde', 'Lunes', '18:00:00'),
    make('miercoles', 'Miércoles', '10:00:00'),
    make('lunes-temprano', 'Lunes', '08:00:00'),
    make('sabado', 'Sábado', '09:00:00'),
  ];
  const result = repo.presentCategoria({ id, nombre: 'Sub-12', horarios: rows });
  assert.deepEqual(result.horarios.map(row => row.id), ['lunes-temprano', 'lunes-tarde', 'miercoles', 'sabado', 'domingo']);
  assert.equal(result.horarios[0].horaInicio, '08:00');
  assert.equal(rows[0].id, 'domingo');
});
