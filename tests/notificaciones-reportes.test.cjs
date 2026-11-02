const { test } = require('node:test');
const assert = require('node:assert/strict');
const { servidor, supabaseAdmin, ADMIN_ID, ALUMNO_USER_ID, buildOpenApiSpec, CATEGORIA_ID } =
  require('./helpers/alumnos-fixture.cjs');
const { databaseFixture } = require('./helpers/supabase-fixture.cjs');
const notificaciones = require('../dist/modules/notificaciones/notificaciones.repository');
const notificacionesService = require('../dist/modules/notificaciones/notificaciones.service');
const reportes = require('../dist/modules/reportes/reportes.service');
const reportesRepository = require('../dist/modules/reportes/reportes.repository');
const { filtroAsistenciaSchema } = require('../dist/modules/reportes/reportes.schema');

const NOT_ID = '77777777-7777-4777-8777-777777777777';

test('NOT lista únicamente las propias y cuenta no leídas aunque haya filtro', async (t) => {
  const fixture = databaseFixture({ notificaciones: [
    { id: NOT_ID, usuario_id: ADMIN_ID, titulo: 'Admin', leida: false, creada_en: '2026-10-15T10:00:00Z' },
    { id: '88888888-8888-4888-8888-888888888888', usuario_id: ALUMNO_USER_ID,
      titulo: 'Alumno leída', leida: true, creada_en: '2026-10-15T11:00:00Z' },
    { id: '99999999-9999-4999-8999-999999999999', usuario_id: ALUMNO_USER_ID,
      titulo: 'Alumno pendiente', leida: false, creada_en: '2026-10-15T12:00:00Z' },
  ] });
  t.mock.method(supabaseAdmin, 'from', (table) => fixture.client.from(table));
  const result = await notificaciones.list(ALUMNO_USER_ID, { page: 1, limit: 20, leida: 'false' });
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].titulo, 'Alumno pendiente');
  assert.deepEqual(result.meta, { page: 1, limit: 20, total: 1, noLeidas: 1 });
  assert.ok(fixture.requests.every((request) => request.params.get('usuario_id') === 'eq.' + ALUMNO_USER_ID));
  await assert.rejects(notificaciones.getById(ALUMNO_USER_ID, NOT_ID), { statusCode: 404 });
  await assert.rejects(notificaciones.markRead(ALUMNO_USER_ID, NOT_ID), { statusCode: 404 });
  await assert.rejects(notificaciones.remove(ALUMNO_USER_ID, NOT_ID), { statusCode: 404 });
  assert.ok(fixture.requests.every((request) => request.params.get('usuario_id') === 'eq.' + ALUMNO_USER_ID));
});

test('NOT HTTP valida token, rol, destinatario y usa ID autenticado', async (t) => {
  const list = t.mock.method(notificacionesService, 'list', async (id) => ({
    data: [], meta: { page: 1, limit: 20, total: 0, noLeidas: 0 }, id,
  }));
  const create = t.mock.method(notificacionesService, 'create', async (body) => body);
  const base = await servidor(t);
  assert.equal((await fetch(base + '/me/notificaciones')).status, 401);
  const mine = await fetch(base + '/me/notificaciones', { headers: { Authorization: 'Bearer alumno' } });
  assert.equal(mine.status, 200);
  assert.equal((await mine.json()).id, ALUMNO_USER_ID);
  assert.equal(list.mock.calls[0].arguments[0], ALUMNO_USER_ID);
  assert.equal((await fetch(base + '/me/notificaciones?usuarioId=' + ADMIN_ID,
    { headers: { Authorization: 'Bearer alumno' } })).status, 400);
  const body = JSON.stringify({ usuarioId: ALUMNO_USER_ID, titulo: 'Entrenamiento' });
  assert.equal((await fetch(base + '/notificaciones', { method: 'POST',
    headers: { Authorization: 'Bearer alumno', 'Content-Type': 'application/json' }, body })).status, 403);
  assert.equal((await fetch(base + '/notificaciones', { method: 'POST',
    headers: { Authorization: 'Bearer admin', 'Content-Type': 'application/json' }, body })).status, 201);
  assert.equal(create.mock.callCount(), 1);
  assert.equal((await fetch(base + '/me/notificaciones/not-a-uuid',
    { headers: { Authorization: 'Bearer admin' } })).status, 400);
});

test('REP calcula indicadores y genera CSV con datos reales', async (t) => {
  const fixture = databaseFixture({
    asistencias: [
      { id: NOT_ID, alumno_id: ALUMNO_USER_ID, categoria_id: CATEGORIA_ID,
        fecha: '2026-10-14', fecha_hora: '2026-10-14T14:00:00Z', metodo: 'ESCANEO' },
      { id: '88888888-8888-4888-8888-888888888888', alumno_id: ALUMNO_USER_ID,
        categoria_id: CATEGORIA_ID, fecha: '2026-10-15', fecha_hora: '2026-10-15T14:00:00Z', metodo: 'MANUAL' },
    ],
    alumnos: [{ id: ALUMNO_USER_ID, dni: '12345678', nombres: 'Ana', apellidos: 'Vega' }],
    categorias: [{ id: CATEGORIA_ID, nombre: 'Juvenil' }],
  });
  t.mock.method(supabaseAdmin, 'from', (table) => fixture.client.from(table));
  const filtro = { desde: '2026-10-14', hasta: '2026-10-16' };
  const result = await reportes.reporteAsistencia(filtro);
  assert.equal(result.indicadores.totalAsistencias, 2);
  assert.equal(result.indicadores.estudiantesUnicos, 1);
  assert.equal(result.indicadores.diasConActividad, 2);
  assert.equal(result.indicadores.promedioPorDia, 0.67);
  assert.equal(result.indicadores.porcentajeEscaneo, 50);
  assert.deepEqual(result.indicadores.porCategoria, [{ categoriaId: CATEGORIA_ID, categoria: 'Juvenil', total: 2 }]);
  assert.deepEqual(result.indicadores.porFecha, [
    { fecha: '2026-10-14', total: 1 }, { fecha: '2026-10-15', total: 1 },
  ]);
  assert.equal(result.registros[0].alumno, 'Ana Vega');
  const csv = await reportes.exportarAsistenciaCsv(filtro);
  assert.match(csv, /Ana Vega/);
  assert.match(csv, /12345678/);
  assert.equal(csv.trim().split('\r\n').length, 3);
});

test('REP recorre páginas mayores que el límite de Supabase', async (t) => {
  const asistencias = Array.from({ length: 501 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    alumno_id: ALUMNO_USER_ID, categoria_id: null, fecha: '2026-10-15',
    fecha_hora: '2026-10-15T14:00:00Z', metodo: 'MANUAL',
  }));
  const fixture = databaseFixture({ asistencias });
  t.mock.method(supabaseAdmin, 'from', (table) => fixture.client.from(table));
  const rows = await reportesRepository.obtenerRegistrosAsistencia({ desde: '2026-10-15', hasta: '2026-10-15' });
  assert.equal(rows.length, 501);
  assert.equal(fixture.requests.filter((request) => request.table === 'asistencias').length, 2);
});

test('REP rechaza fechas inválidas y restringe HTTP a ADM', async (t) => {
  for (const invalid of ['2026-02-30', '15/10/2026', '2026-10-17']) {
    const input = { desde: invalid, hasta: '2026-10-16' };
    assert.equal(filtroAsistenciaSchema.safeParse(input).success, false);
  }
  const base = await servidor(t);
  const url = base + '/reportes/asistencia?desde=2026-10-15&hasta=2026-10-16';
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { Authorization: 'Bearer alumno' } })).status, 403);
  assert.equal((await fetch(base + '/reportes/asistencia?desde=2026-02-30&hasta=2026-10-16',
    { headers: { Authorization: 'Bearer admin' } })).status, 400);
});

test('NOT y REP aparecen en OpenAPI', () => {
  const paths = buildOpenApiSpec().paths;
  assert.equal(paths['/me/notificaciones'].get.operationId, 'NOT-01');
  assert.equal(paths['/notificaciones'].post.operationId, 'NOT-05');
  assert.equal(paths['/reportes/asistencia'].get.operationId, 'REP-01');
  assert.equal(paths['/reportes/asistencia/export'].get.operationId, 'REP-02');
});
