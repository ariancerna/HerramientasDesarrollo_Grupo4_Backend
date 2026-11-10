const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const { ApiError } = require('../dist/lib/errors/api-error');
const { crearPagosService } = require('../dist/modules/pagos/pagos.service');
const { crearPasarelaCulqi } = require('../dist/lib/pasarelas/culqi');

const alumnoUuid = '33333333-3333-4333-8333-333333333333';
const alumno = { id: 'u1', usuario: 'alumno', email: 'a@example.invalid', nombre: 'Ana', rol: 'ALU', estudianteId: alumnoUuid };
const reloj = () => new Date('2026-11-10T15:00:00Z');
const body = { token: 'tkn_test_123', email: 'a@example.invalid', periodo: '2026-11' };

function repo(overrides = {}) {
  return {
    findCurrentForStudent: async () => null,
    findClubConfig: async () => ({ monto: 150, diaVencimiento: 10 }),
    create: async (p) => ({ id: 'nuevo', ...p }),
    updatePaymentDetails: async (id, d) => ({ id, ...d }),
    ...overrides,
  };
}

function pasarela(registro) {
  return { crearCargo: async (input) => { registro.push(input); return { id: 'chr_test_abc' }; } };
}

test('PAG-12 cobra el monto de la base de datos y marca el pago como Tarjeta', async () => {
  const cargos = [];
  let actualizado;
  const service = crearPagosService(repo({
    findCurrentForStudent: async () => ({ id: 'p1', estado: 'pendiente', monto: '180.00', periodo: '2026-11' }),
    updatePaymentDetails: async (id, d) => { actualizado = { id, ...d }; return actualizado; },
  }), reloj, pasarela(cargos));

  await service.pagarConCulqi(alumno, body);

  assert.equal(cargos[0].monto, 180);
  assert.equal(cargos[0].token, 'tkn_test_123');
  assert.deepEqual(actualizado, { id: 'p1', estado: 'pagado', fechaPago: '2026-11-10', metodoPago: 'Tarjeta', codigoOperacion: 'chr_test_abc' });
});

test('PAG-12 crea el cargo del mes actual si no existe, con el monto del club', async () => {
  const cargos = [];
  let creado;
  const service = crearPagosService(repo({ create: async (p) => { creado = p; return p; } }), reloj, pasarela(cargos));

  await service.pagarConCulqi(alumno, body);

  assert.equal(cargos[0].monto, 150);
  assert.equal(creado.estado, 'pagado');
  assert.equal(creado.vencimiento, '2026-11-10');
  assert.equal(creado.codigoOperacion, 'chr_test_abc');
});

test('PAG-12 no cobra una mensualidad ya pagada ni períodos inexistentes', async () => {
  const cargos = [];
  const pagada = crearPagosService(repo({ findCurrentForStudent: async () => ({ id: 'p1', estado: 'pagado', monto: 180 }) }), reloj, pasarela(cargos));
  await assert.rejects(pagada.pagarConCulqi(alumno, body), (e) => e instanceof ApiError && e.statusCode === 409);

  const service = crearPagosService(repo(), reloj, pasarela(cargos));
  await assert.rejects(service.pagarConCulqi(alumno, { ...body, periodo: '2026-08' }), (e) => e.statusCode === 404);
  await assert.rejects(service.pagarConCulqi({ ...alumno, estudianteId: undefined }, body), (e) => e.statusCode === 403);
  assert.equal(cargos.length, 0);
});

test('Cliente Culqi envía céntimos y traduce el rechazo en 402 con el mensaje de Culqi', async () => {
  let enviado;
  const ok = crearPasarelaCulqi('sk_test_x', 'https://culqi.test/v2', async (url, init) => {
    enviado = { url, init };
    return new Response(JSON.stringify({ object: 'charge', id: 'chr_test_1' }), { status: 201 });
  });
  assert.deepEqual(await ok.crearCargo({ monto: 180.5, email: 'a@b.pe', token: 'tkn', descripcion: 'x' }), { id: 'chr_test_1' });
  assert.equal(enviado.url, 'https://culqi.test/v2/charges');
  assert.equal(enviado.init.headers.Authorization, 'Bearer sk_test_x');
  assert.equal(JSON.parse(enviado.init.body).amount, 18050);

  const rechazo = crearPasarelaCulqi('sk_test_x', 'https://culqi.test/v2', async () =>
    new Response(JSON.stringify({ object: 'error', user_message: 'Tu tarjeta ha sido rechazada' }), { status: 402 }));
  await assert.rejects(rechazo.crearCargo({ monto: 1, email: 'a@b.pe', token: 't', descripcion: 'x' }),
    (e) => e.statusCode === 402 && e.message === 'Tu tarjeta ha sido rechazada');

  const sinLlave = crearPasarelaCulqi(undefined);
  await assert.rejects(sinLlave.crearCargo({ monto: 1, email: 'a@b.pe', token: 't', descripcion: 'x' }), (e) => e.statusCode === 503);
});

test('Pasarela demo: aprueba tokens tkn_demo_, simula rechazo y no acepta tokens reales', async () => {
  const { crearPasarelaDemo, crearPasarelaPago, TOKEN_DEMO_RECHAZADO } = require('../dist/lib/pasarelas/culqi');
  const demo = crearPasarelaDemo(() => 'abc123');
  const base = { monto: 180, email: 'a@b.pe', descripcion: 'x' };

  assert.deepEqual(await demo.crearCargo({ ...base, token: 'tkn_demo_4242' }), { id: 'chr_demo_abc123' });
  await assert.rejects(demo.crearCargo({ ...base, token: TOKEN_DEMO_RECHAZADO }), (e) => e.statusCode === 402);
  await assert.rejects(demo.crearCargo({ ...base, token: 'tkn_test_real' }), (e) => e.statusCode === 400);

  // Sin llave secreta se usa la demo; con llave, Culqi real.
  const sinLlave = await crearPasarelaPago(undefined).crearCargo({ ...base, token: 'tkn_demo_1' });
  assert.match(sinLlave.id, /^chr_demo_[0-9a-f]{16}$/);
});
