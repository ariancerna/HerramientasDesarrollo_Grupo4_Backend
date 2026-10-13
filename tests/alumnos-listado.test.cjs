const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
const { servidor, repository, service, supabaseAdmin, profesor, CATEGORIA_ID,
  OTRA_CATEGORIA_ID } = require('./helpers/alumnos-fixture.cjs');
const { alumnosQuerySchema } = require('../dist/modules/alumnos/alumnos.schema');

test('ALU-01 parses bounded pagination and rejects malformed or unknown filters', () => {
  assert.deepEqual(alumnosQuerySchema.parse({}), { page: 1, limit: 20 });
  assert.equal(alumnosQuerySchema.parse({ page: '2', limit: '100', texto: ' Ana ' }).texto, 'Ana');
  for (const query of [
    { page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '1e2' },
    { page: '1000001' }, { page: ['1', '2'] }, { limit: '101' }, { limit: '0' },
    { estado: 'pendiente' }, { categoriaId: 'not-a-uuid' }, { texto: '*admin*' },
    { texto: 'x'.repeat(101) }, { profesorId: CATEGORIA_ID },
  ]) assert.equal(alumnosQuerySchema.safeParse(query).success, false, JSON.stringify(query));
});

test('ALU-01 HTTP validates query and roles before executing a student listing', async (t) => {
  const listing = t.mock.method(repository, 'findAll', async (filters) => ({
    data: [], page: filters.page, limit: filters.limit, total: 0, totalPages: 0,
  }));
  const base = await servidor(t);
  const request = (token, query = '') => fetch(base + '/alumnos' + query, {
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
  assert.equal((await request(null)).status, 401);
  assert.equal((await request('alumno')).status, 403);
  for (const query of ['?page=0', '?limit=101', '?page=1&page=2', '?categoriaId=bad',
    '?profesorId=' + CATEGORIA_ID, '?estado=invalid']) {
    assert.equal((await request('admin', query)).status, 400, query);
  }
  assert.equal(listing.mock.callCount(), 0);
  const response = await request('admin', '?page=2&limit=10&estado=activo&categoriaId=' + CATEGORIA_ID);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { data: [], page: 2, limit: 10, total: 0, totalPages: 0 } });
  const filters = listing.mock.calls[0].arguments[0];
  assert.equal(filters.categoriaId, CATEGORIA_ID);
  assert.equal(filters.from, 10);
  assert.equal(filters.to, 19);
});

test('ALU-01 keeps professor scope when another category is requested and avoids unscoped queries', async (t) => {
  const listing = t.mock.method(repository, 'findAll', async (filters) => ({ data: [], ...filters }));
  const assignments = t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  await service.list(profesor, { categoriaId: OTRA_CATEGORIA_ID });
  assert.deepEqual(listing.mock.calls[0].arguments[0].categoriaIds, [CATEGORIA_ID]);
  assignments.mock.mockImplementation(async () => []);
  const before = listing.mock.callCount();
  assert.deepEqual(await service.list(profesor, {}), { data: [], page: 1, limit: 20, total: 0, totalPages: 0 });
  assert.equal(listing.mock.callCount(), before);
});

test('ALU-01 repository quotes reserved search characters and maintains filters, ordering and range', async (t) => {
  let request;
  const client = createClient('https://listado.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      request = new URL(input);
      return new Response('[]', { headers: { 'Content-Type': 'application/json', 'Content-Range': '*/0' } });
    } },
  });
  t.mock.method(supabaseAdmin, 'from', (table) => client.from(table));
  const result = await repository.findAll({ texto: 'Ana",estado.eq.inactivo,(codigo_%)',
    categoriaId: CATEGORIA_ID, categoriaIds: [CATEGORIA_ID], estado: 'activo', page: 2, limit: 10 });
  const expression = request.searchParams.get('or');
  assert.match(expression, /^\(nombres\.ilike\."/);
  assert.ok(expression.includes('\\"'));
  assert.ok(expression.includes('\\\\_'));
  assert.ok(expression.includes('\\\\%'));
  assert.equal(request.searchParams.get('estado'), 'eq.activo');
  assert.deepEqual(request.searchParams.getAll('categoria_id'), ['eq.' + CATEGORIA_ID, 'in.(' + CATEGORIA_ID + ')']);
  assert.equal(request.searchParams.get('order'), 'apellidos.asc,nombres.asc,id.asc');
  assert.equal(request.searchParams.get('offset'), '10');
  assert.equal(request.searchParams.get('limit'), '10');
  assert.deepEqual(result, { data: [], page: 2, limit: 10, total: 0, totalPages: 0 });
});

test('ALU-01 HTTP masks database errors instead of returning an empty successful list', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(repository, 'findAll', async () => { throw new Error('private database detail'); });
  const base = await servidor(t);
  const response = await fetch(base + '/alumnos', { headers: { Authorization: 'Bearer admin' } });
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes('private'), false);
});
