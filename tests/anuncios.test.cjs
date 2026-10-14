const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const repository = require('../dist/modules/anuncios/anuncios.repository');
const service = require('../dist/modules/anuncios/anuncios.service');
const routes = require('../dist/modules/anuncios/anuncios.routes').default;
const { crearAnuncioSchema, actualizarAnuncioSchema, listarAnunciosQuerySchema } = require('../dist/modules/anuncios/anuncios.schema');
const { supabaseAdmin, supabaseAnon } = require('../dist/config/supabase');
const { errorMiddleware } = require('../dist/middlewares/error.middleware');

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const A1 = U(1), A2 = U(2), PROF = U(10), OTRO_PROF = U(11), CAT = U(20), OTRA_CAT = U(21);
const pg = { page: 1, limit: 20, from: 0, to: 19 };
const admin = { id: U(99), rol: 'ADM' };
const profesor = { id: PROF, rol: 'PROF', profesorId: PROF };
const alumno = { id: U(50), rol: 'ALU', estudianteId: A1 };

// Repositorio en memoria mínimo para las pruebas de create/update.
function mockRepo(t, { alumnos = {}, categoria = [], existente = null, destinatarios = [], falla = false } = {}) {
  const llamadas = { reemplazar: [], create: [], update: [], remove: [] };
  t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CAT]);
  t.mock.method(repository, 'findAlumnosByIds', async (ids) => ids.filter((i) => alumnos[i]).map((i) => ({ id: i, categoria_id: alumnos[i] })));
  t.mock.method(repository, 'findAlumnoIdsActivosByCategoria', async () => categoria);
  t.mock.method(repository, 'findById', async () => existente);
  t.mock.method(repository, 'findDestinatarios', async () => destinatarios);
  t.mock.method(repository, 'create', async (p) => { llamadas.create.push(p); return { id: 'n1', ...p }; });
  t.mock.method(repository, 'update', async (id, p) => { llamadas.update.push(p); return { ...existente, ...p }; });
  t.mock.method(repository, 'remove', async (id) => { llamadas.remove.push(id); });
  t.mock.method(repository, 'reemplazarDestinatarios', async (id, ids) => {
    if (falla) throw new Error('falla BD');
    llamadas.reemplazar.push(ids);
  });
  return llamadas;
}

// ---------- Validación ----------
test('schema: estado por defecto "borrador" al crear, pero un PUT parcial NO lo reinicia', () => {
  assert.equal(crearAnuncioSchema.parse({ titulo: 'Hola club', mensaje: 'x' }).estado, 'borrador');
  assert.deepEqual(actualizarAnuncioSchema.parse({ titulo: 'Nuevo título' }), { titulo: 'Nuevo título' });
});

test('schema rechaza título corto, estado inválido y alumnoIds no UUID', () => {
  assert.equal(crearAnuncioSchema.safeParse({ titulo: 'a', mensaje: 'x' }).success, false);
  assert.equal(crearAnuncioSchema.safeParse({ titulo: 'Hola club', mensaje: 'x', estado: 'publicado' }).success, false);
  assert.equal(crearAnuncioSchema.safeParse({ titulo: 'Hola club', mensaje: 'x', alumnoIds: ['1'] }).success, false);
});

test('schema es estricto, PUT exige al menos un campo y la query valida sus filtros', () => {
  assert.equal(crearAnuncioSchema.safeParse({ titulo: 'Hola club', mensaje: 'x', otro: 1 }).success, false);
  assert.equal(actualizarAnuncioSchema.safeParse({}).success, false);
  assert.equal(actualizarAnuncioSchema.safeParse({ titulo: 'Nuevo título', profesorId: PROF }).success, false);
  assert.equal(listarAnunciosQuerySchema.safeParse({ estado: 'enviado', categoriaId: CAT, page: '1' }).success, true);
  assert.equal(listarAnunciosQuerySchema.safeParse({ estado: 'publicado' }).success, false);
  assert.equal(listarAnunciosQuerySchema.safeParse({ categoriaId: 'abc' }).success, false);
});

// ---------- ANU-01 ----------
test('ANU-01: el alumno solo ve anuncios enviados dirigidos a él (ignora filtros de la query)', async (t) => {
  const findAll = t.mock.method(repository, 'findAll', async () => ({ data: [], total: 0 }));
  await service.list(alumno, { estado: 'borrador', profesorId: OTRO_PROF }, pg);
  const f = findAll.mock.calls[0].arguments[0];
  assert.equal(f.destinatarioAlumnoId, A1);
  assert.equal(f.estado, 'enviado');
});

test('ANU-01: el profesor solo ve los suyos; el administrador filtra libremente', async (t) => {
  const findAll = t.mock.method(repository, 'findAll', async () => ({ data: [], total: 0 }));
  await service.list(profesor, { profesorId: OTRO_PROF }, pg);
  assert.equal(findAll.mock.calls[0].arguments[0].profesorId, PROF);
  await service.list(admin, { profesorId: OTRO_PROF, estado: 'borrador' }, pg);
  assert.equal(findAll.mock.calls[1].arguments[0].profesorId, OTRO_PROF);
  assert.equal(findAll.mock.calls[1].arguments[0].estado, 'borrador');
});

// ---------- ANU-02 ----------
test('ANU-02: sin alumnoIds, los destinatarios son los alumnos activos de la categoría', async (t) => {
  const calls = mockRepo(t, { categoria: [A1, A2] });
  const res = await service.create(profesor, { titulo: 'Torneo', mensaje: 'Sábado', categoriaId: CAT, estado: 'enviado' });
  assert.deepEqual(calls.create[0], { profesor_id: PROF, titulo: 'Torneo', mensaje: 'Sábado', categoria_id: CAT, estado: 'enviado' });
  assert.deepEqual(calls.reemplazar[0], [A1, A2]);
  assert.deepEqual(res.alumno_ids, [A1, A2]);
});

test('ANU-02: alumnoIds explícitos se deduplican y prevalecen sobre la categoría', async (t) => {
  const calls = mockRepo(t, { alumnos: { [A1]: CAT }, categoria: [A1, A2] });
  await service.create(profesor, { titulo: 'Aviso', mensaje: 'x', categoriaId: CAT, alumnoIds: [A1, A1], estado: 'borrador' });
  assert.deepEqual(calls.reemplazar[0], [A1]);
});

test('ANU-02: un anuncio "enviado" sin destinatarios se rechaza (400) y no escribe nada', async (t) => {
  const calls = mockRepo(t, { categoria: [] });
  await assert.rejects(service.create(profesor, { titulo: 'Aviso', mensaje: 'x', categoriaId: CAT, estado: 'enviado' }), { statusCode: 400 });
  await assert.rejects(service.create(profesor, { titulo: 'Aviso', mensaje: 'x', estado: 'enviado' }), { statusCode: 400 });
  assert.equal(calls.create.length, 0);
});

test('ANU-02: un borrador sin destinatarios sí es válido', async (t) => {
  const calls = mockRepo(t);
  await service.create(profesor, { titulo: 'Idea', mensaje: 'x', estado: 'borrador' });
  assert.equal(calls.create.length, 1);
  assert.deepEqual(calls.reemplazar[0], []);
});

test('ANU-02: el profesor no puede dirigirse a otra categoría ni a alumnos ajenos (403)', async (t) => {
  const calls = mockRepo(t, { alumnos: { [A1]: OTRA_CAT } });
  await assert.rejects(service.create(profesor, { titulo: 'Aviso', mensaje: 'x', categoriaId: OTRA_CAT, estado: 'borrador' }), { statusCode: 403 });
  await assert.rejects(service.create(profesor, { titulo: 'Aviso', mensaje: 'x', alumnoIds: [A1], estado: 'borrador' }), { statusCode: 403 });
  assert.equal(calls.create.length, 0);
});

test('ANU-02: alumno inexistente → 422; ADM sin profesorId → 400; el profesor no puede suplantar a otro', async (t) => {
  const calls = mockRepo(t, { alumnos: {} });
  await assert.rejects(service.create(admin, { titulo: 'Aviso', mensaje: 'x', alumnoIds: [A1], profesorId: PROF, estado: 'borrador' }), { statusCode: 422 });
  await assert.rejects(service.create(admin, { titulo: 'Aviso', mensaje: 'x', estado: 'borrador' }), { statusCode: 400 });
  await service.create(profesor, { titulo: 'Aviso', mensaje: 'x', profesorId: OTRO_PROF, estado: 'borrador' });
  assert.equal(calls.create[0].profesor_id, PROF);
});

test('ANU-02: si falla guardar destinatarios se deshace el anuncio (sin transacciones en supabase-js)', async (t) => {
  const calls = mockRepo(t, { categoria: [A1], falla: true });
  await assert.rejects(service.create(profesor, { titulo: 'Aviso', mensaje: 'x', categoriaId: CAT, estado: 'enviado' }), /falla BD/);
  assert.deepEqual(calls.remove, ['n1']);
});

// ---------- ANU-03 ----------
test('ANU-03: el profesor solo edita sus anuncios (403) y el inexistente da 404', async (t) => {
  mockRepo(t, { existente: { id: 'n1', profesor_id: OTRO_PROF, estado: 'borrador', categoria_id: CAT } });
  await assert.rejects(service.update(profesor, 'n1', { titulo: 'Nuevo título' }), { statusCode: 403 });
  mockRepo(t, { existente: null });
  await assert.rejects(service.update(admin, 'nada', { titulo: 'Nuevo título' }), { statusCode: 404 });
  await assert.rejects(service.update(admin, 'n1', {}), { statusCode: 400 });
});

test('ANU-03: editar solo el título no toca los destinatarios', async (t) => {
  const calls = mockRepo(t, { existente: { id: 'n1', profesor_id: PROF, estado: 'enviado', categoria_id: CAT }, destinatarios: [A1] });
  const res = await service.update(profesor, 'n1', { titulo: 'Nuevo título' });
  assert.deepEqual(calls.update[0], { titulo: 'Nuevo título' });
  assert.equal(calls.reemplazar.length, 0);
  assert.deepEqual(res.alumno_ids, [A1]);
});

test('ANU-03: al cambiar de categoría se recalculan los destinatarios', async (t) => {
  const calls = mockRepo(t, { existente: { id: 'n1', profesor_id: PROF, estado: 'borrador', categoria_id: OTRA_CAT }, categoria: [A2] });
  await service.update(profesor, 'n1', { categoriaId: CAT });
  assert.deepEqual(calls.reemplazar[0], [A2]);
});

test('ANU-03: pasar de borrador a enviado completa destinatarios desde la categoría; sin ellos → 400', async (t) => {
  let calls = mockRepo(t, { existente: { id: 'n1', profesor_id: PROF, estado: 'borrador', categoria_id: CAT }, destinatarios: [], categoria: [A1] });
  await service.update(profesor, 'n1', { estado: 'enviado' });
  assert.deepEqual(calls.reemplazar[0], [A1]);

  calls = mockRepo(t, { existente: { id: 'n1', profesor_id: PROF, estado: 'borrador', categoria_id: null }, destinatarios: [], categoria: [] });
  await assert.rejects(service.update(profesor, 'n1', { estado: 'enviado' }), { statusCode: 400 });
  assert.equal(calls.update.length, 0);
});

test('ANU-03: alumnoIds reemplaza la lista de destinatarios', async (t) => {
  const calls = mockRepo(t, { alumnos: { [A2]: CAT }, existente: { id: 'n1', profesor_id: PROF, estado: 'enviado', categoria_id: CAT }, destinatarios: [A1] });
  const res = await service.update(profesor, 'n1', { alumnoIds: [A2] });
  assert.deepEqual(calls.reemplazar[0], [A2]);
  assert.equal(calls.update.length, 0); // no hay campos propios del anuncio que cambiar
  assert.deepEqual(res.alumno_ids, [A2]);
});

// ---------- Detalle con alcance ----------
test('detalle: el alumno solo ve anuncios enviados que lo incluyen; si no, 404 (no revela existencia)', async (t) => {
  const fila = { id: 'n1', profesor_id: PROF, estado: 'enviado' };
  t.mock.method(repository, 'findById', async () => fila);
  const dest = t.mock.method(repository, 'esDestinatario', async () => true);
  assert.equal((await service.getById(alumno, 'n1')).id, 'n1');
  dest.mock.mockImplementation(async () => false);
  await assert.rejects(service.getById(alumno, 'n1'), { statusCode: 404 });
  dest.mock.mockImplementation(async () => true);
  fila.estado = 'borrador';
  await assert.rejects(service.getById(alumno, 'n1'), { statusCode: 404 });
});

// ---------- HTTP ----------
let server, base;
const usuarios = {
  adm: { id: 'adm', usuario: 'a', email: 'a@x', nombre: 'A', rol: 'ADM', activo: true },
  alu: { id: 'alu', usuario: 'b', email: 'b@x', nombre: 'B', rol: 'ALU', estudiante_id: A1, activo: true },
};
before(async () => {
  supabaseAnon.auth.getUser = async (token) => ({ data: { user: usuarios[token] ? { id: token } : null }, error: null });
  supabaseAdmin.from = () => ({ select: () => ({ eq: (_c, id) => ({ single: async () => ({ data: usuarios[id] ?? null, error: null }) }) }) });
  const app = express();
  app.use(express.json());
  app.use('/anuncios', routes);
  app.use(errorMiddleware);
  server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}/anuncios`;
});
after(() => server.close());
const http = (method, path, token, body) => fetch(`${base}${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});

test('HTTP: sin token 401; alumno no crea ni edita (403); body inválido 400', async () => {
  assert.equal((await http('GET', '/')).status, 401);
  assert.equal((await http('POST', '/', 'alu', { titulo: 'Hola club', mensaje: 'x' })).status, 403);
  assert.equal((await http('PUT', `/${U(5)}`, 'alu', { titulo: 'Nuevo título' })).status, 403);
  const res = await http('POST', '/', 'adm', { titulo: 'a', mensaje: '' });
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.ok(json.error.details.titulo && json.error.details.mensaje);
});

test('HTTP: id no UUID → 400, query inválida → 400, campo desconocido → 400, PUT vacío → 400', async () => {
  assert.equal((await http('PUT', '/no-es-uuid', 'adm', { titulo: 'Nuevo título' })).status, 400);
  assert.equal((await http('GET', '/no-es-uuid', 'adm')).status, 400);
  assert.equal((await http('DELETE', '/no-es-uuid', 'adm')).status, 400);
  assert.equal((await http('GET', '/?estado=publicado', 'adm')).status, 400);
  assert.equal((await http('POST', '/', 'adm', { titulo: 'Hola club', mensaje: 'x', profesorId: PROF, extra: 1 })).status, 400);
  assert.equal((await http('PUT', `/${U(5)}`, 'adm', {})).status, 400);
});
