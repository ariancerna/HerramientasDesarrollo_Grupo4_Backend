const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL ??= 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY ??= 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'admin-de-prueba';

const fechas = require('../dist/lib/utils/fechas');
const calRepo = require('../dist/modules/calendario/calendario.repository');
const calendario = require('../dist/modules/calendario/calendario.service');
const evaRepo = require('../dist/modules/evaluaciones/evaluaciones.repository');
const evaluaciones = require('../dist/modules/evaluaciones/evaluaciones.service');
const asiRepo = require('../dist/modules/asistencias/asistencias.repository');
const asistencias = require('../dist/modules/asistencias/asistencias.service');

const ahora = new Date();
const hoy = fechas.fechaEnLima(ahora);
const diaLima = (delta) => fechas.fechaEnLima(new Date(ahora.getTime() + delta * 86400000));
const ayer = diaLima(-1);
const manana = diaLima(1);

test('yaPasoEnLima: compara fecha y hora en Lima', () => {
  const instante = new Date('2026-11-20T21:30:00Z'); // 16:30 en Lima
  assert.equal(fechas.horaEnLima(instante), '16:30');
  assert.equal(fechas.yaPasoEnLima('2026-11-19', undefined, instante), true);
  assert.equal(fechas.yaPasoEnLima('2026-11-20', '16:00', instante), true);
  assert.equal(fechas.yaPasoEnLima('2026-11-20', '16:30', instante), true);
  assert.equal(fechas.yaPasoEnLima('2026-11-20', '17:00', instante), false);
  assert.equal(fechas.yaPasoEnLima('2026-11-21', '08:00', instante), false);
  assert.equal(fechas.esFechaFutura('2026-11-21', instante), true);
  assert.equal(fechas.esFechaFutura('2026-11-20', instante), false);
});

const evento = { titulo: 'Amistoso', horaInicio: '10:00', ubicacion: 'Coliseo', descripcion: 'x' };
const filaEvento = (fecha, hora = '10:00:00') => ({ id: 'ev1', titulo: 'Amistoso', fecha, hora_inicio: hora, hora_fin: null, ubicacion: 'Coliseo', categoria_id: null, descripcion: 'x' });

test('CAL-02 no deja programar eventos en el pasado', async (t) => {
  t.mock.method(calRepo, 'categorias', async () => []);
  const crear = t.mock.method(calRepo, 'create', async (b) => filaEvento(b.fecha));
  await assert.rejects(calendario.crear({ ...evento, fecha: ayer }), (e) => e.statusCode === 400 && /ya pasó/.test(e.message));
  await assert.rejects(calendario.crear({ ...evento, fecha: hoy, horaInicio: '00:00' }), (e) => e.statusCode === 400);
  const ok = await calendario.crear({ ...evento, fecha: manana });
  assert.equal(ok.fecha, manana);
  assert.equal(crear.mock.callCount(), 1);
});

test('CAL-03 no mueve un evento al pasado, pero sí deja corregir textos de uno pasado', async (t) => {
  t.mock.method(calRepo, 'categorias', async () => []);
  t.mock.method(calRepo, 'update', async (id, b) => ({ ...filaEvento(ayer), ...b }));
  t.mock.method(calRepo, 'findById', async () => filaEvento(manana));
  await assert.rejects(calendario.editar('ev1', { fecha: ayer }), (e) => e.statusCode === 400);

  t.mock.method(calRepo, 'findById', async () => filaEvento(ayer));
  const corregido = await calendario.editar('ev1', { titulo: 'Amistoso (resultado 3-1)' });
  assert.equal(corregido.titulo, 'Amistoso (resultado 3-1)');
});

test('EVA-02/03 la fecha de una evaluación no puede ser futura', async (t) => {
  const prof = { id: 'u1', rol: 'PROF', profesorId: 'p1' };
  const create = t.mock.method(evaRepo, 'create', async () => { throw new Error('no debería llegar'); });
  await assert.rejects(evaluaciones.crear(prof, { alumnoId: 'a1', fecha: manana, observaciones: 'x' }), (e) => e.statusCode === 400 && /futura/.test(e.message));
  await assert.rejects(evaluaciones.editar(prof, 'e1', { fecha: manana }), (e) => e.statusCode === 400);
  assert.equal(create.mock.callCount(), 0);
});

test('ASI-03 no permite corregir una asistencia a una fecha futura', async (t) => {
  t.mock.method(asiRepo, 'findById', async () => ({ id: 'as1', alumno_id: 'a1' }));
  const update = t.mock.method(asiRepo, 'update', async () => null);
  const futuro = new Date(Date.now() + 2 * 86400000).toISOString();
  await assert.rejects(asistencias.corregir('as1', { fechaHora: futuro }), (e) => e.statusCode === 422);
  assert.equal(update.mock.callCount(), 0);
});
