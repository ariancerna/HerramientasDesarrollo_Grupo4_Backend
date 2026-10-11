const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const service = require('../dist/modules/pagos/pagos.service');
const controller = require('../dist/modules/pagos/pagos.controller');
const { ApiError } = require('../dist/lib/errors/api-error');

function respuestaMock() {
  return {
    statusCode: 200,
    body: undefined,
    terminado: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send() {
      this.terminado = true;
      return this;
    },
  };
}

test('controlador devuelve 200 con data en consultas, actualizaciones y reversiones', async (t) => {
  const pago = { id: 'p1', estado: 'pendiente' };
  t.mock.method(service, 'list', async () => [pago]);
  t.mock.method(service, 'estadoMensual', async () => ({ alumnos: [], totales: {} }));
  t.mock.method(service, 'history', async () => [pago]);
  t.mock.method(service, 'pagoActual', async () => null);
  t.mock.method(service, 'update', async () => pago);
  t.mock.method(service, 'registrarPorId', async () => ({ ...pago, estado: 'pagado' }));
  t.mock.method(service, 'marcarPendiente', async () => pago);
  const next = (error) => { if (error) throw error; };

  const respuestaLista = respuestaMock();
  await controller.list({ query: {} }, respuestaLista, next);
  assert.equal(respuestaLista.statusCode, 200);
  assert.deepEqual(respuestaLista.body, { data: [pago] });

  const respuestaMensual = respuestaMock();
  await controller.estadoMensual({ query: { periodo: '2026-10', filtro: 'todos' } }, respuestaMensual, next);
  assert.equal(respuestaMensual.statusCode, 200);
  assert.deepEqual(respuestaMensual.body, { data: { alumnos: [], totales: {} } });

  const usuario = { id: 'user-a', rol: 'ALU', estudianteId: 'alumno-a' };
  const respuestaHistorial = respuestaMock();
  await controller.history({ user: usuario }, respuestaHistorial, next);
  assert.deepEqual(respuestaHistorial.body, { data: [pago] });

  const respuestaActual = respuestaMock();
  await controller.pagoActual({ user: usuario }, respuestaActual, next);
  assert.deepEqual(respuestaActual.body, { data: null });

  const respuestaActualizada = respuestaMock();
  await controller.update({ params: { id: 'p1' }, body: { monto: 200 } }, respuestaActualizada, next);
  assert.deepEqual(respuestaActualizada.body, { data: pago });

  const respuestaRegistrada = respuestaMock();
  await controller.registrarPorId({ params: { id: 'p1' }, body: { metodoPago: 'Yape' } }, respuestaRegistrada, next);
  assert.equal(respuestaRegistrada.statusCode, 200);
  assert.equal(respuestaRegistrada.body.data.estado, 'pagado');

  const respuestaPendiente = respuestaMock();
  await controller.marcarPendiente({ params: { id: 'p1' } }, respuestaPendiente, next);
  assert.deepEqual(respuestaPendiente.body, { data: pago });
});

test('controlador devuelve 201 al crear y 200 al actualizar un pago directo', async (t) => {
  const creado = { id: 'nuevo', estado: 'pagado' };
  const actualizado = { id: 'existente', estado: 'pagado' };
  t.mock.method(service, 'create', async () => creado);
  const registrar = t.mock.method(service, 'registrarDirecto', async () => ({ pago: creado, creado: true }));
  const next = (error) => { if (error) throw error; };

  const respuestaCargo = respuestaMock();
  await controller.create({ body: { estudianteId: 'alumno-a', periodo: '2026-10' } }, respuestaCargo, next);
  assert.equal(respuestaCargo.statusCode, 201);
  assert.deepEqual(respuestaCargo.body, { data: creado });

  const respuestaNuevoPago = respuestaMock();
  await controller.registrarDirecto({ body: { estudianteId: 'alumno-a' } }, respuestaNuevoPago, next);
  assert.equal(respuestaNuevoPago.statusCode, 201);
  assert.deepEqual(respuestaNuevoPago.body, { data: creado });

  registrar.mock.mockImplementation(async () => ({ pago: actualizado, creado: false }));
  const respuestaPagoExistente = respuestaMock();
  await controller.registrarDirecto({ body: { estudianteId: 'alumno-a' } }, respuestaPagoExistente, next);
  assert.equal(respuestaPagoExistente.statusCode, 200);
  assert.deepEqual(respuestaPagoExistente.body, { data: actualizado });
});

test('controlador devuelve 201 si genera cargos y 200 cuando no hay cargos nuevos', async (t) => {
  const resultado = { periodo: '2026-10', generados: 2, pagos: [{ id: 'p1' }, { id: 'p2' }] };
  const generar = t.mock.method(service, 'generarMensualidad', async () => resultado);
  const next = (error) => { if (error) throw error; };

  const respuestaGeneracion = respuestaMock();
  await controller.generarMensualidad({ body: { periodo: '2026-10' } }, respuestaGeneracion, next);
  assert.equal(respuestaGeneracion.statusCode, 201);
  assert.deepEqual(respuestaGeneracion.body, { data: resultado });

  generar.mock.mockImplementation(async () => ({ periodo: '2026-10', generados: 0, pagos: [] }));
  const respuestaVacia = respuestaMock();
  await controller.generarMensualidad({ body: { periodo: '2026-10' } }, respuestaVacia, next);
  assert.equal(respuestaVacia.statusCode, 200);
  assert.deepEqual(respuestaVacia.body, { data: { periodo: '2026-10', generados: 0, pagos: [] } });
});

test('controlador elimina con 204 sin cuerpo y propaga errores al middleware', async (t) => {
  const error = ApiError.notFound('Pago no encontrado');
  const eliminar = t.mock.method(service, 'remove', async () => {});
  const siguiente = (fallo) => { if (fallo) throw fallo; };

  const respuestaEliminada = respuestaMock();
  await controller.remove({ params: { id: 'p1' } }, respuestaEliminada, siguiente);
  assert.equal(respuestaEliminada.statusCode, 204);
  assert.equal(respuestaEliminada.terminado, true);
  assert.equal(respuestaEliminada.body, undefined);

  eliminar.mock.mockImplementation(async () => { throw error; });
  let errorPropagado;
  await controller.remove({ params: { id: 'inexistente' } }, respuestaMock(), (fallo) => { errorPropagado = fallo; });
  assert.equal(errorPropagado, error);
});

test('controlador pasa errores de servicio a next sin fabricar respuestas exitosas', async (t) => {
  const error = ApiError.conflict('Ya existe el cargo');
  t.mock.method(service, 'create', async () => { throw error; });
  const respuesta = respuestaMock();
  let propagado;
  await controller.create({ body: {} }, respuesta, (fallo) => { propagado = fallo; });
  assert.equal(propagado, error);
  assert.equal(respuesta.body, undefined);
});
