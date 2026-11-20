const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL ??= 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY ??= 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'admin-de-prueba';

const catRepo = require('../dist/modules/categorias/categorias.repository');
const categorias = require('../dist/modules/categorias/categorias.service');
const sedeRepo = require('../dist/modules/sedes/sedes.repository');
const sedes = require('../dist/modules/sedes/sedes.service');

test('Categorías: no se repite el nombre al crear ni al renombrar', async (t) => {
  t.mock.method(catRepo, 'existeNombre', async (nombre, excluirId) => nombre.trim().toLowerCase() === 'sub-14 masculino' && excluirId !== 'c1');
  const crear = t.mock.method(catRepo, 'create', async (d) => ({ id: 'nuevo', ...d }));
  t.mock.method(catRepo, 'update', async (id, d) => ({ id, ...d }));
  await assert.rejects(categorias.create({ nombre: ' SUB-14 masculino ' }), (e) => e.statusCode === 409 && /Ya existe/.test(e.message));
  assert.equal(crear.mock.callCount(), 0);
  assert.equal((await categorias.update('c1', { nombre: 'Sub-14 masculino' })).id, 'c1'); // la misma categoría puede conservar su nombre
  await assert.rejects(categorias.update('c2', { nombre: 'sub-14 masculino' }), (e) => e.statusCode === 409);
});

test('Sedes: no se repite el nombre', async (t) => {
  t.mock.method(sedeRepo, 'existeNombre', async (nombre) => nombre.trim().toLowerCase() === 'los olivos');
  t.mock.method(sedeRepo, 'create', async (d) => ({ id: 's2', ...d }));
  await assert.rejects(sedes.create({ nombre: 'Los Olivos' }), (e) => e.statusCode === 409);
  assert.equal((await sedes.create({ nombre: 'Comas' })).id, 's2');
});
