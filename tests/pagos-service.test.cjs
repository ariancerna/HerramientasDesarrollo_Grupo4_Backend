const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const { ApiError } = require('../dist/lib/errors/api-error');
const { crearPagosService, periodoActualEnLima } = require('../dist/modules/pagos/pagos.service');

const alumnoUuid = '33333333-3333-4333-8333-333333333333';
const usuarioAlumno = {
  id: 'user-id',
  usuario: 'alumno',
  email: 'alumno@example.invalid',
  nombre: 'Ana',
  rol: 'ALU',
  estudianteId: alumnoUuid,
};

function repositoryMock(overrides = {}) {
  return {
    findAll: async () => [],
    findById: async () => null,
    findActiveStudents: async () => [],
    findByPeriodForStudents: async () => [],
    findActiveStudentsWithoutPayment: async () => [],
    findHistoryForStudent: async () => [],
    findCurrentForStudent: async () => null,
    create: async () => null,
    createManyIfMissing: async () => [],
    update: async () => null,
    updatePaymentDetails: async () => null,
    remove: async () => undefined,
    ...overrides,
  };
}

test('PAG-01 aplica filtros del listado y PAG-03 crea siempre un pago pendiente', async () => {
  const filtros = { periodo: '2026-10', estado: 'pendiente', estudianteId: alumnoUuid };
  let recibidos;
  let creado;
  const pago = { id: 'p1', estado: 'pendiente' };
  const service = crearPagosService(repositoryMock({
    findAll: async (params) => { recibidos = params; return [pago]; },
    create: async (payload) => { creado = payload; return pago; },
  }));

  assert.deepEqual(await service.list(filtros), [pago]);
  assert.equal(recibidos, filtros);
  assert.equal(await service.create({ estudianteId: alumnoUuid, periodo: '2026-10' }), pago);
  assert.deepEqual(creado, { estudianteId: alumnoUuid, periodo: '2026-10', estado: 'pendiente' });
});

test('PAG-02 devuelve todos los activos, distingue sin_cargo y calcula totales tras filtrar', async () => {
  const service = crearPagosService(repositoryMock({
    findActiveStudents: async () => [
      { id: 'a', nombres: 'Ana', apellidos: 'Rojas', dni: '11111111', codigo: 'A1' },
      { id: 'b', nombres: 'Bruno', apellidos: 'Díaz', dni: '22222222', codigo: null },
      { id: 'c', nombres: 'Cami', apellidos: 'Paz', dni: '33333333', codigo: 'C3' },
    ],
    findByPeriodForStudents: async () => [
      { id: 'p1', alumno_id: 'a', periodo: '2026-10', monto: '180.00', estado: 'pagado', fecha_pago: '2026-10-01', metodo_pago: 'Yape', codigo_operacion: null, vencimiento: null },
      { id: 'p2', alumno_id: 'b', periodo: '2026-10', monto: 180, estado: 'vencido', fecha_pago: null, metodo_pago: null, codigo_operacion: null, vencimiento: '2026-10-01' },
    ],
  }));

  const todos = await service.estadoMensual({ periodo: '2026-10', filtro: 'todos' });
  assert.deepEqual(todos.totales, { alumnos: 3, alDia: 1, porPagar: 2 });
  assert.equal(todos.alumnos[0].pago.monto, 180);
  assert.equal(todos.alumnos[2].estado, 'sin_cargo');
  assert.equal(todos.alumnos[2].pago, null);
  const porPagar = await service.estadoMensual({ periodo: '2026-10', filtro: 'porPagar' });
  assert.deepEqual(porPagar.alumnos.map((alumno) => alumno.estudianteId), ['b', 'c']);
  assert.deepEqual(porPagar.totales, { alumnos: 2, alDia: 0, porPagar: 2 });
  const alDia = await service.estadoMensual({ periodo: '2026-10', filtro: 'alDia' });
  assert.deepEqual(alDia.alumnos.map((alumno) => alumno.estudianteId), ['a']);
  assert.deepEqual(alDia.totales, { alumnos: 1, alDia: 1, porPagar: 0 });
});

test('PAG-03 devuelve conflicto ante un cargo duplicado y PAG-04 solo admite campos editables', async () => {
  const duplicado = ApiError.conflict('Ya existe el pago');
  let cambios;
  const service = crearPagosService(repositoryMock({
    create: async () => { throw duplicado; },
    update: async (id, payload) => { cambios = { id, ...payload }; return cambios; },
  }));

  await assert.rejects(service.create({ estudianteId: alumnoUuid, periodo: '2026-10' }), (error) =>
    error === duplicado && error.statusCode === 409);
  assert.deepEqual(await service.update('p1', { monto: 200, vencimiento: null }), {
    id: 'p1',
    monto: 200,
    vencimiento: null,
  });
  assert.deepEqual(cambios, { id: 'p1', monto: 200, vencimiento: null });
  await assert.rejects(service.update('p1', { estado: 'pagado' }), (error) =>
    error instanceof ApiError && error.statusCode === 400);
});

test('PAG-05 marca como pagado y guarda fecha de Lima, método y código', async () => {
  let actualizado;
  const service = crearPagosService(repositoryMock({
    updatePaymentDetails: async (id, payload) => { actualizado = { id, ...payload }; return actualizado; },
  }), () => new Date('2026-10-11T03:30:00Z'));

  await service.registrarPorId('p1', { metodoPago: 'Yape', codigoOperacion: 'OP-123' });
  assert.deepEqual(actualizado, {
    id: 'p1',
    estado: 'pagado',
    fechaPago: '2026-10-10',
    metodoPago: 'Yape',
    codigoOperacion: 'OP-123',
  });
});

test('PAG-06 actualiza cargos existentes y crea cargos pagados cuando faltan', async () => {
  let actualizado;
  const servicioExistente = crearPagosService(repositoryMock({
    findCurrentForStudent: async () => ({ id: 'p1' }),
    updatePaymentDetails: async (id, payload) => { actualizado = { id, ...payload }; return actualizado; },
  }), () => new Date('2026-10-11T03:30:00Z'));
  const resultadoExistente = await servicioExistente.registrarDirecto({
    estudianteId: alumnoUuid, periodo: '2026-10', metodoPago: 'Plin', codigoOperacion: 'OP-2',
  });
  assert.equal(resultadoExistente.creado, false);
  assert.deepEqual(actualizado, {
    id: 'p1', estado: 'pagado', fechaPago: '2026-10-10', metodoPago: 'Plin', codigoOperacion: 'OP-2',
  });

  let insertado;
  const servicioNuevo = crearPagosService(repositoryMock({
    findCurrentForStudent: async () => null,
    create: async (payload) => { insertado = payload; return { id: 'p-nuevo', ...payload }; },
  }), () => new Date('2026-10-11T03:30:00Z'));
  const resultadoNuevo = await servicioNuevo.registrarDirecto({
    estudianteId: alumnoUuid, periodo: '2026-10', metodoPago: 'Efectivo',
  });
  assert.equal(resultadoNuevo.creado, true);
  assert.deepEqual(insertado, {
    estudianteId: alumnoUuid,
    periodo: '2026-10',
    estado: 'pagado',
    fechaPago: '2026-10-10',
    metodoPago: 'Efectivo',
    codigoOperacion: null,
  });
});

test('PAG-06 resuelve carreras de creación consultando y actualizando el cargo concurrente', async () => {
  let consultas = 0;
  let actualizado;
  const service = crearPagosService(repositoryMock({
    findCurrentForStudent: async () => {
      consultas += 1;
      return consultas === 1 ? null : { id: 'p-concurrente' };
    },
    create: async () => { throw ApiError.conflict('Duplicado concurrente'); },
    updatePaymentDetails: async (id, payload) => { actualizado = { id, ...payload }; return actualizado; },
  }), () => new Date('2026-10-11T03:30:00Z'));

  const resultado = await service.registrarDirecto({
    estudianteId: alumnoUuid, periodo: '2026-10', metodoPago: 'Yape',
  });
  assert.equal(resultado.creado, false);
  assert.equal(actualizado.id, 'p-concurrente');
  assert.equal(actualizado.estado, 'pagado');
});

test('PAG-07 revierte a pendiente y limpia los datos de pago', async () => {
  let actualizado;
  const service = crearPagosService(repositoryMock({
    updatePaymentDetails: async (id, payload) => { actualizado = { id, ...payload }; return actualizado; },
  }));

  await service.marcarPendiente('p1');
  assert.deepEqual(actualizado, {
    id: 'p1', estado: 'pendiente', fechaPago: null, metodoPago: null, codigoOperacion: null,
  });
});

test('PAG-08 delega la eliminación y PAG-09 solo genera para alumnos faltantes', async () => {
  let eliminacion;
  let creados;
  const pagosNuevos = [{ id: 'p-b' }];
  const service = crearPagosService(repositoryMock({
    remove: async (id) => { eliminacion = id; },
    findActiveStudentsWithoutPayment: async () => [{ id: 'b' }],
    createManyIfMissing: async (payloads) => { creados = payloads; return pagosNuevos; },
  }));

  await service.remove('p1');
  assert.equal(eliminacion, 'p1');
  const resultado = await service.generarMensualidad({
    periodo: '2026-10', monto: 200, vencimiento: '2026-10-31',
  });
  assert.deepEqual(creados, [{
    estudianteId: 'b', periodo: '2026-10', monto: 200, vencimiento: '2026-10-31',
  }]);
  assert.deepEqual(resultado, { periodo: '2026-10', generados: 1, pagos: pagosNuevos });
});

test('PAG-10 limita historial al alumno autenticado y PAG-11 busca el período Lima actual', async () => {
  let historialAlumno;
  let pagoActualConsultado;
  const service = crearPagosService(repositoryMock({
    findHistoryForStudent: async (id) => { historialAlumno = id; return [{ id: 'p1' }]; },
    findCurrentForStudent: async (id, periodo) => { pagoActualConsultado = { id, periodo }; return null; },
  }), () => new Date('2027-01-01T03:00:00Z'));

  assert.deepEqual(await service.history(usuarioAlumno), [{ id: 'p1' }]);
  assert.equal(historialAlumno, alumnoUuid);
  assert.equal(await service.pagoActual(usuarioAlumno), null);
  assert.deepEqual(pagoActualConsultado, { id: alumnoUuid, periodo: '2026-12' });
  assert.equal(periodoActualEnLima(new Date('2027-01-01T03:00:00Z')), '2026-12');
});

test('PAG-10 y PAG-11 rechazan cuentas sin vínculo de alumno; PAG-04 informa pago inexistente', async () => {
  const service = crearPagosService(repositoryMock({
    findById: async () => null,
  }));
  const sinVinculo = { ...usuarioAlumno, estudianteId: undefined };

  await assert.rejects(service.history(sinVinculo), (error) => error instanceof ApiError && error.statusCode === 403);
  await assert.rejects(service.pagoActual(sinVinculo), (error) => error instanceof ApiError && error.statusCode === 403);
  await assert.rejects(service.getById('inexistente'), (error) => error instanceof ApiError && error.statusCode === 404);
});
