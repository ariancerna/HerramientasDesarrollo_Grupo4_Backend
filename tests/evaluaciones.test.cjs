const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Configuración ficticia incluso si quien ejecuta la prueba tiene un .env real.
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const repository = require('../dist/modules/evaluaciones/evaluaciones.repository');
const service = require('../dist/modules/evaluaciones/evaluaciones.service');
const routes = require('../dist/modules/evaluaciones/evaluaciones.routes').default;
const { crearEvaluacionSchema, actualizarEvaluacionSchema, listarEvaluacionesQuerySchema } = require('../dist/modules/evaluaciones/evaluaciones.schema');
const { supabaseAdmin, supabaseAnon } = require('../dist/config/supabase');
const { errorMiddleware } = require('../dist/middlewares/error.middleware');

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ALUMNO = U(1), OTRO_ALUMNO = U(2), PROF = U(10), OTRO_PROF = U(11), CAT = U(20), OTRA_CAT = U(21);
const pg = { page: 1, limit: 20, from: 0, to: 19 };
const admin = { id: U(99), rol: 'ADM' };
const profesor = { id: PROF, rol: 'PROF', profesorId: PROF };
const alumno = { id: U(50), rol: 'ALU', estudianteId: ALUMNO };
const valido = {
  alumnoId: ALUMNO, fecha: '2026-10-09', rendimientoTecnico: 8, rendimientoFisico: 7, actitud: 9, observaciones: 'Buen avance',
};

// ---------- Validación (schema) ----------
test('schema acepta una evaluación válida y rechaza notas fuera de 1–10', () => {
  assert.equal(crearEvaluacionSchema.safeParse(valido).success, true);
  for (const nota of [0, 11, 5.5]) {
    assert.equal(crearEvaluacionSchema.safeParse({ ...valido, actitud: nota }).success, false);
  }
});

test('schema exige observaciones, fecha real y alumnoId UUID', () => {
  assert.equal(crearEvaluacionSchema.safeParse({ ...valido, observaciones: '   ' }).success, false);
  for (const f of ['2026-02-31', '2026-13-01', '2026-00-10', '2025-02-29']) {
    assert.equal(crearEvaluacionSchema.safeParse({ ...valido, fecha: f }).success, false, f);
  }
  assert.equal(crearEvaluacionSchema.safeParse({ ...valido, fecha: '2028-02-29' }).success, true); // bisiesto válido
  assert.equal(crearEvaluacionSchema.safeParse({ ...valido, fecha: '09/10/2026' }).success, false);
  assert.equal(crearEvaluacionSchema.safeParse({ ...valido, alumnoId: 'abc' }).success, false);
});

test('schema de edición es parcial, exige al menos un campo y rechaza cambiar alumno/profesor', () => {
  assert.deepEqual(actualizarEvaluacionSchema.parse({ actitud: 5 }), { actitud: 5 });
  assert.equal(actualizarEvaluacionSchema.safeParse({}).success, false);
  assert.equal(actualizarEvaluacionSchema.safeParse({ actitud: 5, alumnoId: ALUMNO }).success, false);
  assert.equal(actualizarEvaluacionSchema.safeParse({ actitud: 5, profesorId: PROF }).success, false);
});

test('schema es estricto: un campo desconocido se rechaza en vez de ignorarse', () => {
  assert.equal(crearEvaluacionSchema.safeParse({ ...valido, nota: 10 }).success, false);
});

test('schema de la query valida UUIDs, fechas y rango desde<=hasta', () => {
  assert.equal(listarEvaluacionesQuerySchema.safeParse({ alumnoId: ALUMNO, desde: '2026-01-01', hasta: '2026-12-31', page: '2', limit: '10' }).success, true);
  assert.equal(listarEvaluacionesQuerySchema.safeParse({ alumnoId: 'abc' }).success, false);
  assert.equal(listarEvaluacionesQuerySchema.safeParse({ desde: '2026-12-31', hasta: '2026-01-01' }).success, false);
  assert.equal(listarEvaluacionesQuerySchema.safeParse({ limit: '500' }).success, false);
  assert.equal(listarEvaluacionesQuerySchema.safeParse({ cualquiera: 'x' }).success, false);
});

// ---------- EVA-01 list ----------
test('EVA-01: el alumno solo ve sus evaluaciones aunque pida otro alumnoId', async (t) => {
  const findAll = t.mock.method(repository, 'findAll', async () => ({ data: [{ id: 'e1' }], total: 1 }));
  const res = await service.list(alumno, { alumnoId: OTRO_ALUMNO }, pg);
  assert.equal(findAll.mock.calls[0].arguments[0].alumnoId, ALUMNO);
  assert.deepEqual(res.meta, { page: 1, limit: 20, total: 1 });
});

test('EVA-01: alumno sin vínculo recibe 403', async () => {
  await assert.rejects(service.list({ id: 'x', rol: 'ALU' }, {}, pg), { statusCode: 403 });
});

test('EVA-01: el profesor queda limitado a sus categorías; sin categorías devuelve vacío sin consultar', async (t) => {
  const cats = t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CAT]);
  const findAll = t.mock.method(repository, 'findAll', async () => ({ data: [], total: 0 }));
  await service.list(profesor, {}, pg);
  assert.deepEqual(findAll.mock.calls[0].arguments[0].categoriaIds, [CAT]);

  cats.mock.mockImplementation(async () => []);
  const res = await service.list(profesor, {}, pg);
  assert.equal(findAll.mock.callCount(), 1);
  assert.deepEqual(res, { data: [], meta: { page: 1, limit: 20, total: 0 } });
});

test('EVA-01: el administrador filtra libremente', async (t) => {
  const findAll = t.mock.method(repository, 'findAll', async () => ({ data: [], total: 0 }));
  await service.list(admin, { alumnoId: OTRO_ALUMNO, desde: '2026-01-01', hasta: '2026-12-31' }, pg);
  assert.deepEqual(findAll.mock.calls[0].arguments[0], {
    alumnoId: OTRO_ALUMNO, profesorId: undefined, desde: '2026-01-01', hasta: '2026-12-31',
  });
});

// ---------- EVA-02 create ----------
test('EVA-02: el profesor firma con su propio id y mapea a snake_case', async (t) => {
  t.mock.method(repository, 'findAlumno', async () => ({ id: ALUMNO, categoria_id: CAT }));
  t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CAT]);
  const create = t.mock.method(repository, 'create', async (p) => ({ id: 'e1', ...p }));
  await service.create(profesor, { ...valido, profesorId: OTRO_PROF }); // intenta suplantar a otro profesor
  assert.deepEqual(create.mock.calls[0].arguments[0], {
    alumno_id: ALUMNO, profesor_id: PROF, fecha: '2026-10-09',
    rendimiento_tecnico: 8, rendimiento_fisico: 7, actitud: 9, observaciones: 'Buen avance',
  });
});

test('EVA-02: el profesor no puede evaluar alumnos de otra categoría', async (t) => {
  t.mock.method(repository, 'findAlumno', async () => ({ id: ALUMNO, categoria_id: OTRA_CAT }));
  t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CAT]);
  const create = t.mock.method(repository, 'create', async () => ({}));
  await assert.rejects(service.create(profesor, valido), { statusCode: 403 });
  assert.equal(create.mock.callCount(), 0);
});

test('EVA-02: alumno inexistente → 422; ADM sin profesorId → 400; ADM con profesorId → crea', async (t) => {
  const findAlumno = t.mock.method(repository, 'findAlumno', async () => null);
  await assert.rejects(service.create(admin, { ...valido, profesorId: PROF }), { statusCode: 422 });

  findAlumno.mock.mockImplementation(async () => ({ id: ALUMNO, categoria_id: CAT }));
  await assert.rejects(service.create(admin, valido), { statusCode: 400 });

  const create = t.mock.method(repository, 'create', async (p) => p);
  await service.create(admin, { ...valido, profesorId: PROF });
  assert.equal(create.mock.calls[0].arguments[0].profesor_id, PROF);
});

// ---------- EVA-03 update ----------
test('EVA-03: el profesor solo edita sus evaluaciones; ADM edita cualquiera', async (t) => {
  const existente = { id: 'e1', profesor_id: OTRO_PROF, alumno_id: ALUMNO };
  t.mock.method(repository, 'findById', async () => existente);
  const update = t.mock.method(repository, 'update', async (_id, p) => ({ id: 'e1', ...p }));

  await assert.rejects(service.update(profesor, 'e1', { actitud: 3 }), { statusCode: 403 });
  assert.equal(update.mock.callCount(), 0);

  const res = await service.update(admin, 'e1', { actitud: 3, rendimientoTecnico: 4 });
  assert.deepEqual(update.mock.calls[0].arguments[1], { actitud: 3, rendimiento_tecnico: 4 });
  assert.equal(res.actitud, 3);

  existente.profesor_id = PROF;
  await service.update(profesor, 'e1', { observaciones: 'ok' });
  assert.equal(update.mock.callCount(), 2);
});

test('EVA-03: inexistente → 404 y body vacío → 400', async (t) => {
  t.mock.method(repository, 'findById', async () => null);
  await assert.rejects(service.update(admin, 'nada', { actitud: 3 }), { statusCode: 404 });
  await assert.rejects(service.update(admin, 'e1', {}), { statusCode: 400 });
});

// ---------- Detalle con alcance ----------
test('detalle: el alumno no puede leer la evaluación de otro; el profesor solo de sus categorías', async (t) => {
  const fila = { id: 'e1', alumno_id: OTRO_ALUMNO, alumnos: { categoria_id: OTRA_CAT } };
  t.mock.method(repository, 'findById', async () => fila);
  t.mock.method(repository, 'findCategoriaIdsByProfesor', async () => [CAT]);
  await assert.rejects(service.getById(alumno, 'e1'), { statusCode: 403 });
  await assert.rejects(service.getById(profesor, 'e1'), { statusCode: 403 });
  assert.equal((await service.getById(admin, 'e1')).id, 'e1');
});

// ---------- HTTP: roles y validación ----------
let server, base;
const usuarios = {
  adm: { id: 'adm', usuario: 'a', email: 'a@x', nombre: 'A', rol: 'ADM', activo: true },
  alu: { id: 'alu', usuario: 'b', email: 'b@x', nombre: 'B', rol: 'ALU', estudiante_id: ALUMNO, activo: true },
};

before(async () => {
  supabaseAnon.auth.getUser = async (token) => ({ data: { user: usuarios[token] ? { id: token } : null }, error: null });
  supabaseAdmin.from = () => ({ select: () => ({ eq: (_c, id) => ({ single: async () => ({ data: usuarios[id] ?? null, error: null }) }) }) });
  const app = express();
  app.use(express.json());
  app.use('/evaluaciones', routes);
  app.use(errorMiddleware);
  server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}/evaluaciones`;
});
after(() => server.close());

const http = (method, path, token, body) => fetch(`${base}${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});

test('HTTP: sin token 401; alumno no puede crear ni editar (403); body inválido 400 con detalles', async () => {
  assert.equal((await http('GET', '/')).status, 401);
  assert.equal((await http('POST', '/', 'alu', valido)).status, 403);
  assert.equal((await http('PUT', `/${U(5)}`, 'alu', { actitud: 3 })).status, 403);

  const res = await http('POST', '/', 'adm', { ...valido, actitud: 99 });
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.error.code, 'BAD_REQUEST');
  assert.ok(json.error.details.actitud);
});

test('HTTP: id no UUID → 400, query inválida → 400, campo desconocido → 400, PUT vacío → 400', async () => {
  assert.equal((await http('PUT', '/no-es-uuid', 'adm', { actitud: 3 })).status, 400);
  assert.equal((await http('GET', '/no-es-uuid', 'adm')).status, 400);
  assert.equal((await http('DELETE', '/no-es-uuid', 'adm')).status, 400);
  assert.equal((await http('GET', '/?alumnoId=abc', 'adm')).status, 400);
  assert.equal((await http('GET', '/?foo=1', 'adm')).status, 400);
  assert.equal((await http('POST', '/', 'adm', { ...valido, profesorId: PROF, extra: 1 })).status, 400);
  assert.equal((await http('PUT', `/${U(5)}`, 'adm', {})).status, 400);
});
