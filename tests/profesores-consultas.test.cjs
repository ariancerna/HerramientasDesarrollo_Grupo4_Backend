const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
const repository = require('../dist/modules/profesores/profesores.repository');
const { supabaseAdmin } = require('../dist/config/supabase');
const first = '11111111-1111-4111-8111-111111111111';
const second = '22222222-2222-4222-8222-222222222222';

function fixture(t, profiles, users, failUsers = false) {
  const requests = [];
  const client = createClient('https://club.test', 'test', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      const url = new URL(input);
      const table = url.pathname.split('/').at(-1);
      requests.push({ table, params: url.searchParams });
      if (table === 'usuarios' && failUsers) {
        return new Response(JSON.stringify({ code: 'TEST_ERROR', message: 'Database unavailable' }), { status: 500 });
      }
      let rows = table === 'profesores' ? profiles : users;
      const id = url.searchParams.get('id');
      if (id?.startsWith('eq.')) rows = rows.filter(row => row.id === id.slice(3));
      return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
    } },
  });
  t.mock.method(supabaseAdmin, 'from', table => client.from(table));
  return requests;
}

test('PRF une cuentas por UUID en una consulta sin depender de FK de usuarios', async (t) => {
  const requests = fixture(t, [
    { id: first, nombre: 'Primero', sede_id: first, profesores_categorias: [{ categoria_id: second }] },
    { id: second, nombre: 'Segundo', sede_id: first, profesores_categorias: [] },
  ], [{ id: first, usuario: 'primero', email: 'primero@example.invalid', rol: 'PROF' }]);
  const rows = await repository.findAll({ sedeId: first });
  assert.equal(rows[0].usuario, 'primero');
  assert.deepEqual(rows[0].categoriaIds, [second]);
  assert.equal(rows[1].usuario, null);
  assert.equal(rows[0].password, undefined);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].params.get('select'), '*,profesores_categorias(categoria_id)');
  assert.equal(requests[0].params.get('sede_id'), `eq.${first}`);
  assert.equal(requests[1].params.get('rol'), 'eq.PROF');
  assert.equal(requests[1].params.get('id'), `in.(${first},${second})`);
  assert.equal(requests[1].params.get('select'), 'id,usuario,email,rol');
  assert.equal((await repository.findById(first)).usuario, 'primero');
});

test('PRF no consulta cuentas cuando el listado o detalle esta vacio', async (t) => {
  const requests = fixture(t, [], []);
  assert.deepEqual(await repository.findAll(), []);
  assert.equal(await repository.findById(first), null);
  assert.equal(requests.every(request => request.table === 'profesores'), true);
});

test('PRF propaga errores de cuentas en lugar de devolver perfiles incompletos', async (t) => {
  fixture(t, [{ id: first, nombre: 'Primero', profesores_categorias: [] }], [], true);
  await assert.rejects(repository.findAll(), { code: 'TEST_ERROR' });
});

test('PRF comprueba usuario literal sin distinguir mayusculas y excluye la cuenta editada', async (t) => {
  const requests = fixture(t, [], []);
  assert.equal(await repository.usuarioExiste('profe_12', first), false);
  assert.equal(requests[0].params.get('usuario'), 'ilike.profe\\_12');
  assert.equal(requests[0].params.get('id'), `neq.${first}`);
  assert.equal(requests[0].params.get('limit'), '1');
});
