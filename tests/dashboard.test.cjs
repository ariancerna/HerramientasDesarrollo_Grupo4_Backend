const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { databaseFixture } = require('./helpers/supabase-fixture.cjs');

// Configuración ficticia incluso si quien ejecuta la prueba tiene un .env real.
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const { crearDashboardRepository } = require('../dist/modules/dashboard/dashboard.repository');
const { crearDashboardService } = require('../dist/modules/dashboard/dashboard.service');
const { contextoDashboard, combinarActividades } = require('../dist/modules/dashboard/dashboard.utils');
const { supabaseAdmin, supabaseAnon } = require('../dist/config/supabase');
const dashboardRoutes = require('../dist/modules/dashboard/dashboard.routes').default;
const { errorMiddleware } = require('../dist/middlewares/error.middleware');
const { buildOpenApiSpec } = require('../dist/docs/openapi');
require('../dist/docs/data');

const NOW = new Date('2026-10-06T17:00:00Z'); // martes, mediodía de Lima
const alumnoUser = { id: 'user-a', rol: 'ALU', estudianteId: 'a' };
const profesorUser = { id: 'p', rol: 'PROF' };

function datos() {
  return {
    categorias: [{ id: 'c1', nombre: 'Sub-17' }, { id: 'c2', nombre: 'Sub-19' }],
    profesores: [{ id: 'p' }, { id: 'otro-profesor' }],
    profesores_categorias: [{ profesor_id: 'p', categoria_id: 'c1' }],
    alumnos: [
      { id: 'a', nombres: 'Ana', apellidos: 'Rojas', categoria_id: 'c1', estado: 'activo' },
      { id: 'b', nombres: 'Bruno', apellidos: 'Díaz', categoria_id: 'c2', estado: 'inactivo' },
      { id: 'c', nombres: 'Camila', apellidos: 'Paz', categoria_id: 'c1', estado: 'activo' },
    ],
    asistencias: [
      { id: 's1', alumno_id: 'a', categoria_id: 'c1', fecha: '2026-10-06', fecha_hora: '2026-10-06T16:00:00Z', metodo: 'ESCANEO' },
      { id: 's2', alumno_id: 'b', categoria_id: 'c2', fecha: '2026-10-06', fecha_hora: '2026-10-06T15:00:00Z', metodo: 'MANUAL' },
      { id: 's3', alumno_id: 'a', categoria_id: 'c1', fecha: '2026-09-30', fecha_hora: '2026-10-01T03:00:00Z', metodo: 'MANUAL' },
    ],
    pagos: [
      { id: 'pay1', alumno_id: 'a', periodo: '2026-10', monto: '180.00', estado: 'pendiente', vencimiento: '2026-10-05', fecha_pago: null, metodo_pago: null },
      { id: 'pay2', alumno_id: 'a', periodo: '2026-09', monto: 180, estado: 'pagado', vencimiento: '2026-09-10', fecha_pago: '2026-10-04', metodo_pago: 'Yape' },
      { id: 'pay3', alumno_id: 'b', periodo: '2026-10', monto: 200, estado: 'vencido', vencimiento: '2026-10-01', fecha_pago: null },
      { id: 'pay4', alumno_id: 'c', periodo: '2026-10', monto: 180, estado: 'pendiente', vencimiento: '2026-10-06', fecha_pago: null },
    ],
    horarios: [
      { id: 'h1', categoria_id: 'c1', dia: 'Martes', hora_inicio: '18:00:00', hora_fin: '20:00:00', cancha: 'Cancha A', estado: 'activo' },
      { id: 'h2', categoria_id: 'c2', dia: 'Martes', hora_inicio: '19:00:00', hora_fin: '21:00:00', cancha: 'Cancha B', estado: 'activo' },
      { id: 'h3', categoria_id: 'c1', dia: 'Miércoles', hora_inicio: '18:00:00', hora_fin: '20:00:00', cancha: 'Cancelada', estado: 'cancelado' },
    ],
    eventos: [
      { id: 'e-pasado', titulo: 'Ya terminó', fecha: '2026-10-06', hora_inicio: '09:00:00', hora_fin: null, ubicacion: 'Club', categoria_id: null },
      { id: 'e-otro', titulo: 'Otra categoría', fecha: '2026-10-06', hora_inicio: '13:00:00', hora_fin: null, ubicacion: 'Club', categoria_id: 'c2' },
      { id: 'e-general', titulo: 'Reunión general', fecha: '2026-10-07', hora_inicio: '10:00:00', hora_fin: null, ubicacion: 'Club', categoria_id: null },
    ],
    evaluaciones: [
      { id: 'ev1', alumno_id: 'a', profesor_id: 'p', fecha: '2026-10-01', rendimiento_tecnico: 8, rendimiento_fisico: 7, actitud: 9, observaciones: 'Buen avance' },
      { id: 'ev2', alumno_id: 'a', profesor_id: 'p', fecha: '2026-10-03', observaciones: 'Segunda revisión' },
      { id: 'ev3', alumno_id: 'c', profesor_id: 'otro-profesor', fecha: '2026-10-05', observaciones: 'Privada de otro profesor' },
      { id: 'ev4', alumno_id: 'b', profesor_id: 'p', fecha: '2026-10-05', observaciones: 'Categoría no asignada' },
    ],
    anuncios: [
      { id: 'n1', titulo: 'Aviso para Ana', mensaje: 'Entrenamiento', estado: 'enviado', created_at: '2026-10-05T12:00:00Z' },
      { id: 'n2', titulo: 'Borrador privado', mensaje: 'Pendiente', estado: 'borrador', created_at: '2026-10-06T12:00:00Z' },
      { id: 'n3', titulo: 'Privado de Bruno', mensaje: 'Solo para Bruno', estado: 'enviado', created_at: '2026-10-06T13:00:00Z' },
    ],
    anuncios_destinatarios: [{ anuncio_id: 'n1', alumno_id: 'a' }, { anuncio_id: 'n2', alumno_id: 'a' }, { anuncio_id: 'n3', alumno_id: 'b' }],
  };
}

function preparar(tables = datos()) {
  const fixture = databaseFixture(tables);
  const service = crearDashboardService(crearDashboardRepository(fixture.client), () => NOW);
  return { ...fixture, service };
}

test('el día y el mes se calculan en Lima al cruzar medianoche UTC y año nuevo', () => {
  const fecha = contextoDashboard(new Date('2027-01-01T03:00:00Z'));
  assert.equal(fecha.hoy, '2026-12-31');
  assert.equal(fecha.hora, '22:00:00');
  assert.equal(fecha.inicioMes, '2026-12-01');
  assert.equal(fecha.siguienteMes, '2027-01-01');
});

test('DSH-01 obtiene conteos reales, vencidos por fecha y registros ordenados', async () => {
  const { service } = preparar();
  const data = await service.resumenAdmin();
  assert.deepEqual(data.alumnos, { total: 3, activos: 2, inactivos: 1 });
  assert.equal(data.asistenciasHoy, 2);
  assert.deepEqual(data.pagos, { vencidos: 2, pendientes: 1 });
  assert.equal(data.ultimosRegistros[0].estudiante, 'Ana Rojas');
  assert.equal(data.ultimosRegistros[0].categoria, 'Sub-17');
  assert.equal(data.proximasActividades[0].id, 'e-otro');
  assert.equal(data.proximasActividades.length, 5);
  assert.ok(!data.proximasActividades.some((actividad) => actividad.id === 'e-pasado'));
});

test('DSH-02 limita datos a categorías asignadas y cuenta alumnos evaluados distintos', async () => {
  const { service, requests } = preparar();
  const data = await service.resumenProfesor(profesorUser);
  assert.deepEqual(data.categorias, [{ id: 'c1', nombre: 'Sub-17' }]);
  assert.equal(data.alumnosAsignados, 2);
  assert.equal(data.alumnosSinEvaluacion, 1);
  assert.deepEqual(data.misEvaluaciones.map((item) => item.id), ['ev2', 'ev1']);
  assert.ok(data.proximasSesiones.every((actividad) => actividad.categoriaId === null || actividad.categoriaId === 'c1'));
  assert.equal(data.proximasSesiones.filter((actividad) => actividad.id === 'e-general').length, 1);
  for (const query of requests.filter((item) => item.table === 'evaluaciones')) {
    assert.equal(query.params.get('profesor_id'), 'eq.p');
    assert.ok(query.params.has('alumno_id'));
  }
});

test('DSH-03 muestra solo pagos, anuncios enviados y movimientos del alumno vinculado', async () => {
  const { service, requests } = preparar();
  const data = await service.resumenAlumno(alumnoUser);
  assert.equal(data.mensualidadActual.id, 'pay1');
  assert.equal(data.mensualidadActual.monto, 180);
  assert.equal(data.mensualidadActual.estado, 'vencido');
  assert.equal(data.asistenciasDelMes, 1);
  assert.deepEqual(data.anuncios.map((item) => item.id), ['n1']);
  assert.deepEqual(data.movimientos.map((item) => item.id), ['s1', 'pay2', 's3']);
  assert.equal(data.proximaActividad.categoriaId, 'c1');
  for (const query of requests.filter((item) => ['pagos', 'asistencias', 'anuncios_destinatarios'].includes(item.table))) {
    assert.equal(query.params.get('alumno_id'), 'eq.a');
  }
});

test('los dashboards vacíos devuelven ceros, null y listas vacías', async () => {
  const admin = await preparar({}).service.resumenAdmin();
  assert.deepEqual(admin, { alumnos: { total: 0, activos: 0, inactivos: 0 }, asistenciasHoy: 0, pagos: { vencidos: 0, pendientes: 0 }, proximasActividades: [], ultimosRegistros: [] });
  const profesor = await preparar({ profesores: [{ id: 'p' }] }).service.resumenProfesor(profesorUser);
  assert.deepEqual(profesor, { categorias: [], alumnosAsignados: 0, alumnosSinEvaluacion: 0, proximasSesiones: [], misEvaluaciones: [] });
  const alumno = await preparar({ alumnos: [{ id: 'a', categoria_id: null }] }).service.resumenAlumno(alumnoUser);
  assert.deepEqual(alumno, { mensualidadActual: null, asistenciasDelMes: 0, proximaActividad: null, anuncios: [], movimientos: [] });
});

test('una cuenta ALU sin vínculo falla sin intentar buscar por el UUID de Auth', () => {
  const { service, requests } = preparar();
  assert.throws(() => service.resumenAlumno({ id: 'a', rol: 'ALU' }), { statusCode: 403 });
  assert.equal(requests.length, 0);
});

test('los perfiles inexistentes devuelven 404', async () => {
  const { service } = preparar({});
  await assert.rejects(service.resumenAlumno(alumnoUser), { statusCode: 404 });
  await assert.rejects(service.resumenProfesor(profesorUser), { statusCode: 404 });
});

test('los fallos de Supabase se propagan en los tres dashboards', async () => {
  for (const [method, user] of [['resumenAdmin'], ['resumenProfesor', profesorUser], ['resumenAlumno', alumnoUser]]) {
    const { service, failures } = preparar();
    failures.add('categorias');
    await assert.rejects(service[method](user), { code: 'TEST_DB_ERROR' });
  }
});

test('más de 1000 alumnos no se truncan por el límite de PostgREST', async () => {
  const tables = datos();
  tables.alumnos = Array.from({ length: 1001 }, (_, i) => ({ id: `a-${String(i).padStart(4, '0')}`, categoria_id: 'c1' }));
  tables.evaluaciones = [{ id: 'last-eval', alumno_id: 'a-1000', profesor_id: 'p', fecha: '2026-10-01', observaciones: 'Alumno en última página' }];
  const { service, requests } = preparar(tables);
  const data = await service.resumenProfesor(profesorUser);
  assert.equal(data.alumnosAsignados, 1001);
  assert.equal(data.alumnosSinEvaluacion, 1000);
  assert.equal(data.misEvaluaciones[0].id, 'last-eval');
  assert.ok(requests.filter((item) => item.table === 'evaluaciones').every((item) => item.params.get('alumno_id').split(',').length <= 100));
});

test('la agenda normaliza días con tilde, excluye cancelados y sesiones ya iniciadas', () => {
  const horario = { id: 'h', categoria_id: 'c1', dia: ' Miércoles ', hora_inicio: '09:00:00', hora_fin: '11:00:00', estado: 'activo', cancha: null };
  const actividades = combinarActividades([{ id: 'c1', nombre: 'Sub-17' }], [horario, { ...horario, id: 'cancelado', estado: 'cancelado' }], [], contextoDashboard(new Date('2026-10-07T15:00:00Z')));
  assert.equal(actividades[0].fecha, '2026-10-14');
  assert.equal(actividades[0].ubicacion, 'Cancha principal');
  assert.ok(actividades.every((item) => !item.id.includes('cancelado')));
});

test('los eventos con segundos no se descartan ni se ordenan por el ID', () => {
  const evento = { titulo: 'Evento', fecha: '2026-10-06', hora_fin: null, ubicacion: 'Club', categoria_id: null };
  const actividades = combinarActividades([], [], [
    { ...evento, id: 'a', hora_inicio: '12:00:45' },
    { ...evento, id: 'b', hora_inicio: '12:00:30' },
  ], contextoDashboard(new Date('2026-10-06T17:00:15Z')));
  assert.deepEqual(actividades.map((item) => item.id), ['b', 'a']);
  assert.ok(actividades.every((item) => !Object.hasOwn(item, 'inicio')));
});

test('Swagger registra DSH-01, DSH-02 y DSH-03', () => {
  const spec = buildOpenApiSpec();
  for (const [role, id] of [['admin', 'DSH-01'], ['profesor', 'DSH-02'], ['alumno', 'DSH-03']]) {
    assert.equal(spec.paths[`/dashboard/${role}`].get.operationId, id);
  }
});

let server;
let baseUrl;
const httpFixture = databaseFixture(datos());
httpFixture.tables.usuarios = [
  { id: 'admin', rol: 'ADM', activo: true },
  { id: 'p', rol: 'PROF', activo: true },
  { id: 'user-a', rol: 'ALU', estudiante_id: 'a', activo: true },
  { id: 'sin-vinculo', rol: 'ALU', activo: true },
  { id: 'deshabilitado', rol: 'ADM', activo: false },
];

before(async () => {
  supabaseAdmin.from = httpFixture.client.from.bind(httpFixture.client);
  supabaseAnon.auth.getUser = async (token) => ({ data: { user: httpFixture.tables.usuarios.some((user) => user.id === token) ? { id: token } : null }, error: null });
  const app = express();
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use(errorMiddleware);
  server = await new Promise((resolve) => {
    const running = app.listen(0, '127.0.0.1', () => resolve(running));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/dashboard`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('HTTP: todos los endpoints requieren un token válido', async () => {
  for (const path of ['admin', 'profesor', 'alumno']) {
    for (const headers of [{}, { Authorization: 'Bearer inválido' }]) {
      const response = await fetch(`${baseUrl}/${path}`, { headers });
      assert.equal(response.status, 401);
      assert.equal((await response.json()).error.code, 'UNAUTHORIZED');
    }
  }
});

test('HTTP: matriz de permisos por rol, 200 propio y 403 para los demás', async () => {
  for (const [token, allowed] of [['admin', 'admin'], ['p', 'profesor'], ['user-a', 'alumno']]) {
    for (const path of ['admin', 'profesor', 'alumno']) {
      const response = await fetch(`${baseUrl}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, path === allowed ? 200 : 403);
      const body = await response.json();
      assert.ok(path === allowed ? body.data : body.error.code === 'FORBIDDEN');
    }
  }
});

test('HTTP: parámetros ajenos no permiten suplantar el alumno del token', async () => {
  const response = await fetch(`${baseUrl}/alumno?estudianteId=b&alumno_id=b`, { headers: { Authorization: 'Bearer user-a' } });
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.mensualidadActual.id, 'pay1');
  assert.deepEqual(data.anuncios.map((item) => item.id), ['n1']);
  assert.ok(!JSON.stringify(data).includes('Privado de Bruno'));
});

test('HTTP: las cuentas deshabilitadas y alumnos sin vínculo reciben 403', async () => {
  for (const [token, path] of [['deshabilitado', 'admin'], ['sin-vinculo', 'alumno']]) {
    const response = await fetch(`${baseUrl}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 403);
  }
});

test('HTTP: errores de base de datos producen 500 y no exponen detalles internos', async (t) => {
  t.mock.method(console, 'error', () => {});
  httpFixture.failures.add('pagos');
  try {
    const response = await fetch(`${baseUrl}/admin`, { headers: { Authorization: 'Bearer admin' } });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  } finally {
    httpFixture.failures.clear();
  }
});
