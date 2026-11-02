const { test } = require('node:test');
const assert = require('node:assert/strict');
const { servidor, supabaseAdmin, buildOpenApiSpec, ADMIN_ID, PROFESOR_ID, ALUMNO_ID, ALUMNO_USER_ID,
  CATEGORIA_ID, OTRA_CATEGORIA_ID, profesor, alumno, admin } = require('./helpers/alumnos-fixture.cjs');
const { databaseFixture } = require('./helpers/supabase-fixture.cjs');
const alumnosRepo = require('../dist/modules/alumnos/alumnos.repository');
const notificacionesRepo = require('../dist/modules/notificaciones/notificaciones.repository');
const asiRepo = require('../dist/modules/asistencias/asistencias.repository');
const asi = require('../dist/modules/asistencias/asistencias.service');
const evaRepo = require('../dist/modules/evaluaciones/evaluaciones.repository');
const eva = require('../dist/modules/evaluaciones/evaluaciones.service');
const anuRepo = require('../dist/modules/anuncios/anuncios.repository');
const anu = require('../dist/modules/anuncios/anuncios.service');
const cal = require('../dist/modules/calendario/calendario.service');
const { crearAsistenciaSchema } = require('../dist/modules/asistencias/asistencias.schema');
const { fechaEnLima } = require('../dist/lib/utils/fechas');

const ASI_ID = '77777777-7777-4777-8777-777777777777';
const alumnoRow = { id: ALUMNO_ID, dni: '12345678', codigo: 'GC-2026-001', nombres: 'Ana', apellidos: 'Vega',
  categoria_id: CATEGORIA_ID, estado: 'activo' };

function mockAsistencias(t, { existe = false } = {}) {
  t.mock.method(alumnosRepo, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  t.mock.method(asiRepo, 'findAlumnoByDni', async (dni) => (dni === alumnoRow.dni ? { ...alumnoRow } : null));
  t.mock.method(asiRepo, 'existeEnFecha', async () => existe);
  t.mock.method(asiRepo, 'findDetalles', async () => ({
    alumnos: new Map([[ALUMNO_ID, alumnoRow]]), categorias: new Map([[CATEGORIA_ID, 'Juvenil']]),
  }));
  const avisos = t.mock.method(notificacionesRepo, 'notificarAlumnos', async () => 1);
  const create = t.mock.method(asiRepo, 'create', async (row) => ({ id: ASI_ID, ...row }));
  return { create, avisos };
}

test('la fecha de asistencia se calcula en America/Lima, no en UTC', () => {
  // 20:30 en Lima del 14 = 01:30 UTC del 15.
  assert.equal(fechaEnLima(new Date('2026-10-15T01:30:00Z')), '2026-10-14');
});

test('ASI-01 exige dni o estudianteId, pero no ambos', () => {
  assert.equal(crearAsistenciaSchema.safeParse({ metodo: 'ESCANEO' }).success, false);
  assert.equal(crearAsistenciaSchema.safeParse({ metodo: 'MANUAL', dni: '12345678', estudianteId: ALUMNO_ID }).success, false);
  assert.equal(crearAsistenciaSchema.safeParse({ metodo: 'ESCANEO', dni: '12345678' }).success, true);
});

test('ASI-01 registra con categoría del alumno, fecha Lima y notifica al alumno', async (t) => {
  const { create, avisos } = mockAsistencias(t);
  const result = await asi.registrar(profesor, { dni: '12345678', metodo: 'ESCANEO', fechaHora: '2026-10-15T01:30:00Z' });
  const row = create.mock.calls[0].arguments[0];
  assert.equal(row.fecha, '2026-10-14');
  assert.equal(row.categoria_id, CATEGORIA_ID);
  assert.deepEqual({ estudiante: result.estudiante, categoria: result.categoria, metodo: result.metodo },
    { estudiante: 'Ana Vega', categoria: 'Juvenil', metodo: 'ESCANEO' });
  assert.deepEqual(avisos.mock.calls[0].arguments[0], [ALUMNO_ID]);
});

test('ASI-01 responde 404, 409, 403 y 422 según la regla de negocio', async (t) => {
  mockAsistencias(t, { existe: true });
  await assert.rejects(asi.registrar(admin, { dni: '00000000', metodo: 'MANUAL' }), { statusCode: 404 });
  await assert.rejects(asi.registrar(admin, { dni: '12345678', metodo: 'MANUAL' }), { statusCode: 409 });
  alumnoRow.categoria_id = OTRA_CATEGORIA_ID;
  t.after(() => { alumnoRow.categoria_id = CATEGORIA_ID; alumnoRow.estado = 'activo'; });
  await assert.rejects(asi.registrar(profesor, { dni: '12345678', metodo: 'MANUAL' }), { statusCode: 403 });
  alumnoRow.categoria_id = CATEGORIA_ID;
  alumnoRow.estado = 'inactivo';
  await assert.rejects(asi.registrar(profesor, { dni: '12345678', metodo: 'MANUAL' }), { statusCode: 422 });
});

test('ASI-02 limita al profesor a sus categorías', async (t) => {
  mockAsistencias(t);
  const findAll = t.mock.method(asiRepo, 'findAll', async () => ({ rows: [], total: 0 }));
  await assert.rejects(asi.listar(profesor, { categoriaId: OTRA_CATEGORIA_ID, page: 1, limit: 20 }), { statusCode: 403 });
  const result = await asi.listar(profesor, { page: 1, limit: 20 });
  assert.deepEqual(findAll.mock.calls[0].arguments[0].categoriaIds, [CATEGORIA_ID]);
  assert.deepEqual(result.meta, { page: 1, limit: 20, total: 0 });
});

test('ASI HTTP: roles y rutas /me según la lista de endpoints', async (t) => {
  const base = await servidor(t);
  const auth = (token) => ({ headers: { Authorization: 'Bearer ' + token } });
  assert.equal((await fetch(base + '/asistencias')).status, 401);
  assert.equal((await fetch(base + '/asistencias', auth('alumno'))).status, 403);
  assert.equal((await fetch(base + '/me/asistencias', auth('profesor'))).status, 403);
  assert.equal((await fetch(base + '/asistencias/no-uuid', { method: 'DELETE', ...auth('admin') })).status, 400);
  assert.equal((await fetch(base + '/asistencias/' + ASI_ID, { method: 'DELETE', ...auth('profesor') })).status, 403);
});

test('EVA: solo el autor edita/elimina y solo evalúa alumnos de sus categorías', async (t) => {
  t.mock.method(alumnosRepo, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  t.mock.method(evaRepo, 'findAlumno', async () => ({ id: ALUMNO_ID, categoria_id: OTRA_CATEGORIA_ID }));
  t.mock.method(evaRepo, 'findById', async () => ({ id: ASI_ID, profesor_id: ADMIN_ID }));
  const remove = t.mock.method(evaRepo, 'remove', async () => {});
  await assert.rejects(eva.crear(profesor, { alumnoId: ALUMNO_ID, fecha: '2026-10-14', observaciones: 'Bien' }), { statusCode: 403 });
  await assert.rejects(eva.eliminar(profesor, ASI_ID), { statusCode: 403 });
  assert.equal(remove.mock.callCount(), 0);
});

test('EVA HTTP: crear es solo para PROF y el ADM puede listar', async (t) => {
  const base = await servidor(t);
  const body = JSON.stringify({ alumnoId: ALUMNO_ID, fecha: '2026-10-14', observaciones: 'Bien', actitud: 11 });
  const post = (token) => fetch(base + '/evaluaciones', { method: 'POST', body,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } });
  assert.equal((await post('admin')).status, 403);
  assert.equal((await post('profesor')).status, 400); // actitud fuera de 1–10
});

test('ANU-05 envía una sola vez y notifica a los destinatarios', async (t) => {
  const anuncio = { id: ASI_ID, profesor_id: PROFESOR_ID, titulo: 'Partido', mensaje: 'Sábado 9am',
    categoria_id: null, estado: 'borrador', created_at: '2026-10-15T10:00:00Z' };
  t.mock.method(anuRepo, 'findById', async () => ({ ...anuncio }));
  t.mock.method(anuRepo, 'marcarEnviado', async () => ({ ...anuncio, estado: 'enviado' }));
  t.mock.method(anuRepo, 'destinatarios', async () => new Map([[ASI_ID, [ALUMNO_ID]]]));
  t.mock.method(anuRepo, 'nombres', async () => ({ profesores: new Map(), categorias: new Map() }));
  const avisos = t.mock.method(notificacionesRepo, 'notificarAlumnos', async () => 1);
  const result = await anu.enviar(profesor, ASI_ID);
  assert.equal(result.estado, 'enviado');
  assert.deepEqual(avisos.mock.calls[0].arguments[0], [ALUMNO_ID]);
  anuncio.estado = 'enviado';
  await assert.rejects(anu.enviar(profesor, ASI_ID), { statusCode: 409 });
  anuncio.estado = 'borrador';
  anuncio.profesor_id = ADMIN_ID;
  await assert.rejects(anu.enviar(profesor, ASI_ID), { statusCode: 403 });
});

test('ANU-02 rechaza destinatarios fuera de las categorías del profesor', async (t) => {
  t.mock.method(alumnosRepo, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  t.mock.method(anuRepo, 'alumnos', async () => [{ id: ALUMNO_ID, categoria_id: OTRA_CATEGORIA_ID }]);
  const create = t.mock.method(anuRepo, 'create', async () => { throw new Error('No debe insertar'); });
  await assert.rejects(anu.crear(profesor, { titulo: 'x', mensaje: 'y', destinatarios: [ALUMNO_ID], estado: 'borrador' }),
    { statusCode: 403 });
  assert.equal(create.mock.callCount(), 0);
});

test('CAL-05 aplica el alcance por rol', async (t) => {
  t.mock.method(alumnosRepo, 'findCategoriaIdsByProfesor', async () => [CATEGORIA_ID]);
  await assert.rejects(cal.actividades(profesor, { categoriaId: OTRA_CATEGORIA_ID, limite: 5 }), { statusCode: 403 });
  await assert.rejects(cal.actividades({ ...alumno, estudianteId: undefined }, { limite: 5 }), { statusCode: 403 });
});

test('NOT-03 marca como leídas solo las notificaciones propias', async (t) => {
  const fixture = databaseFixture({ notificaciones: [] });
  t.mock.method(supabaseAdmin, 'from', (table) => fixture.client.from(table));
  await notificacionesRepo.markAllRead(ALUMNO_USER_ID);
  const request = fixture.requests.find((item) => item.method === 'PATCH');
  assert.equal(request.params.get('usuario_id'), 'eq.' + ALUMNO_USER_ID);
  assert.equal(request.params.get('leida'), 'eq.false');
});

test('Swagger documenta los endpoints nuevos de la lista v1', () => {
  const { paths } = buildOpenApiSpec();
  for (const [path, method, id] of [
    ['/asistencias', 'post', 'ASI-01'], ['/me/asistencias', 'get', 'ASI-05'],
    ['/eventos/{id}', 'put', 'CAL-03'], ['/calendario/actividades', 'get', 'CAL-05'],
    ['/evaluaciones', 'post', 'EVA-02'], ['/anuncios/{id}/enviar', 'post', 'ANU-05'],
    ['/me/anuncios', 'get', 'ANU-06'], ['/me/notificaciones/leer-todas', 'post', 'NOT-03'],
    ['/me/horarios', 'get', 'HOR-05'], ['/me/categorias', 'get', 'PRF-06'], ['/me/perfil', 'get', 'ALU-08-ME'],
  ]) {
    assert.equal(paths[path]?.[method]?.operationId, id, `${method.toUpperCase()} ${path}`);
  }
});

test('CFG-03: los cargos usan el monto y el día de vencimiento del club si no se envían', async () => {
  const { crearPagosService } = require('../dist/modules/pagos/pagos.service');
  let creados;
  const service = crearPagosService({
    findActiveStudentsWithoutPayment: async () => [{ id: 'a' }],
    createManyIfMissing: async (filas) => { creados = filas; return filas; },
    findClubConfig: async () => ({ monto: 200, diaVencimiento: 5 }),
  });
  await service.generarMensualidad({ periodo: '2026-11' });
  assert.deepEqual(creados, [{ estudianteId: 'a', periodo: '2026-11', monto: 200, vencimiento: '2026-11-05' }]);
  await service.generarMensualidad({ periodo: '2026-11', monto: 150 });
  assert.deepEqual(creados[0], { estudianteId: 'a', periodo: '2026-11', monto: 150, vencimiento: '2026-11-05' });
});

test('AUTH-08 responde 429 al agotar intentos y 400 si el código no sirve', async (t) => {
  const authRepo = require('../dist/modules/auth/auth.repository');
  const auth = require('../dist/modules/auth/auth.service');
  const verificar = t.mock.method(authRepo, 'verificarCodigo', async () => 'bloqueado');
  const token = t.mock.method(authRepo, 'guardarResetToken', async () => 'token');
  await assert.rejects(auth.verifyCode('a@example.invalid', '000000'), { statusCode: 429 });
  verificar.mock.mockImplementation(async () => 'invalido');
  await assert.rejects(auth.verifyCode('a@example.invalid', '000000'), { statusCode: 400 });
  assert.equal(token.mock.callCount(), 0);
  verificar.mock.mockImplementation(async () => 'ok');
  assert.deepEqual(await auth.verifyCode('a@example.invalid', '123456'), { resetToken: 'token' });
});
