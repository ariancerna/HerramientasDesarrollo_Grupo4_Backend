const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const {
  actualizarPagoSchema,
  crearPagoSchema,
  estadoMensualQuerySchema,
  generarMensualidadSchema,
  listarPagosQuerySchema,
  pagoIdParamsSchema,
  registrarPagoDirectoSchema,
  registrarPagoSchema,
} = require('../dist/modules/pagos/pagos.schema');

const uuid = '33333333-3333-4333-8333-333333333333';

test('PAG valida períodos, montos positivos, vencimientos válidos y UUIDs', () => {
  assert.equal(crearPagoSchema.safeParse({
    estudianteId: uuid,
    periodo: '2026-10',
    monto: 180,
    vencimiento: '2026-10-31',
  }).success, true);
  assert.equal(crearPagoSchema.safeParse({
    estudianteId: 'no-es-uuid',
    periodo: '2026-13',
    monto: 0,
    vencimiento: '2026-02-30',
  }).success, false);
  assert.equal(generarMensualidadSchema.safeParse({
    periodo: '2026-10',
    monto: 0.01,
    vencimiento: '2026-02-28',
  }).success, true);
});

test('PAG valida filtros permitidos y valores opcionales de consultas', () => {
  assert.deepEqual(listarPagosQuerySchema.parse({
    periodo: '2026-10',
    estado: 'pagado',
    estudianteId: uuid,
  }), {
    periodo: '2026-10',
    estado: 'pagado',
    estudianteId: uuid,
  });
  assert.equal(listarPagosQuerySchema.safeParse({ estado: 'otro' }).success, false);
  assert.equal(listarPagosQuerySchema.safeParse({ estudianteId: 'invalido' }).success, false);
  assert.deepEqual(estadoMensualQuerySchema.parse({ periodo: '2026-10' }), {
    periodo: '2026-10',
    filtro: 'todos',
  });
  assert.equal(estadoMensualQuerySchema.safeParse({ periodo: '2026-10', filtro: 'pendientes' }).success, false);
});

test('PAG valida método de pago y codigoOperacion opcional', () => {
  for (const metodoPago of ['Yape', 'Plin', 'Transferencia', 'Efectivo']) {
    assert.equal(registrarPagoSchema.safeParse({ metodoPago }).success, true);
  }
  assert.deepEqual(registrarPagoDirectoSchema.parse({
    estudianteId: uuid,
    periodo: '2026-10',
    metodoPago: 'Yape',
    codigoOperacion: ' OP-123 ',
  }), {
    estudianteId: uuid,
    periodo: '2026-10',
    metodoPago: 'Yape',
    codigoOperacion: 'OP-123',
  });
  assert.equal(registrarPagoSchema.safeParse({ metodoPago: 'Bitcoin' }).success, false);
  assert.equal(registrarPagoSchema.safeParse({ metodoPago: 'Yape', codigoOperacion: ' ' }).success, false);
});

test('PAG valida UUID de ruta y exige al menos un campo editable', () => {
  assert.deepEqual(pagoIdParamsSchema.parse({ id: uuid }), { id: uuid });
  assert.equal(pagoIdParamsSchema.safeParse({ id: 'pago-1' }).success, false);
  assert.equal(actualizarPagoSchema.safeParse({}).success, false);
  assert.equal(actualizarPagoSchema.safeParse({ monto: -1 }).success, false);
  assert.deepEqual(actualizarPagoSchema.parse({ vencimiento: null }), { vencimiento: null });
});
