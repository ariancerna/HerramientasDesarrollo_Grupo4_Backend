const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL ??= 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY ??= 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'admin-de-prueba';

const { ApiError } = require('../dist/lib/errors/api-error');
const correoLib = require('../dist/lib/correo/correo');
const { correoCodigoRecuperacion } = require('../dist/lib/correo/plantillas');
const repository = require('../dist/modules/auth/auth.repository');
const service = require('../dist/modules/auth/auth.service');
const { forgotPasswordSchema, verifyCodeSchema } = require('../dist/modules/auth/auth.schema');

function repo(t, overrides = {}) {
  const llamadas = [];
  const base = {
    codigoReciente: async () => false,
    obtenerUsuarioPorEmail: async () => ({ id: 'u1', nombre: 'Ana Torres', email: 'ana@gmail.com', activo: true }),
    invalidarCodigos: async (c) => { llamadas.push(['invalidar', c]); },
    guardarCodigoRecuperacion: async (c, codigo) => { llamadas.push(['guardar', c, codigo]); },
    ...overrides,
  };
  for (const [nombre, fn] of Object.entries(base)) t.mock.method(repository, nombre, fn);
  return llamadas;
}

test('AUTH-07 envía el código por correo a la cuenta encontrada', async (t) => {
  const llamadas = repo(t);
  const enviados = [];
  t.mock.method(correoLib, 'hayProveedorCorreo', () => true);
  t.mock.method(correoLib, 'enviarCorreo', async (c) => { enviados.push(c); });

  const r = await service.forgotPassword('  Ana@Gmail.com ');

  assert.match(r.mensaje, /Si el correo está registrado/);
  const codigo = llamadas.find((l) => l[0] === 'guardar')[2];
  assert.match(codigo, /^\d{6}$/);
  assert.deepEqual(llamadas.find((l) => l[0] === 'guardar').slice(0, 2), ['guardar', 'ana@gmail.com']);
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].para, 'ana@gmail.com');
  assert.ok(enviados[0].html.includes(codigo) && enviados[0].texto.includes(codigo));
});

test('AUTH-07 no revela si el correo existe ni envía a cuentas inexistentes o inactivas', async (t) => {
  t.mock.method(correoLib, 'hayProveedorCorreo', () => true);
  const enviar = t.mock.method(correoLib, 'enviarCorreo', async () => {});
  repo(t, { obtenerUsuarioPorEmail: async () => null });
  const r1 = await service.forgotPassword('nadie@gmail.com');
  t.mock.restoreAll();

  t.mock.method(correoLib, 'hayProveedorCorreo', () => true);
  const enviar2 = t.mock.method(correoLib, 'enviarCorreo', async () => {});
  repo(t, { obtenerUsuarioPorEmail: async () => ({ id: 'u2', activo: false }) });
  const r2 = await service.forgotPassword('inactivo@gmail.com');

  assert.deepEqual(r1, r2);
  assert.equal(enviar.mock.callCount() + enviar2.mock.callCount(), 0);
});

test('AUTH-07 si el correo falla, anula el código y propaga el error para reintentar', async (t) => {
  const llamadas = repo(t);
  t.mock.method(correoLib, 'hayProveedorCorreo', () => true);
  t.mock.method(correoLib, 'enviarCorreo', async () => { throw new ApiError(502, 'CORREO_NO_ENVIADO', 'x'); });

  await assert.rejects(service.forgotPassword('ana@gmail.com'), (e) => e.statusCode === 502);
  assert.deepEqual(llamadas.map((l) => l[0]), ['invalidar', 'guardar', 'invalidar']);
});

test('AUTH-07/08 normaliza el correo y valida el formato del código', () => {
  assert.equal(forgotPasswordSchema.parse({ correo: ' Ana@Gmail.COM ' }).correo, 'ana@gmail.com');
  assert.equal(verifyCodeSchema.safeParse({ correo: 'a@b.pe', codigo: '12a456' }).success, false);
  assert.equal(verifyCodeSchema.parse({ correo: 'A@B.pe', codigo: '123456' }).correo, 'a@b.pe');
});

test('Correo: Brevo y Resend arman la petición correcta y los rechazos dan 502', async (t) => {
  t.mock.method(console, 'error', () => {});
  const correo = correoCodigoRecuperacion({ para: 'ana@gmail.com', nombre: 'Ana Torres', codigo: '123456', minutosVigencia: 10, club: 'El <Golazo> Club' });
  assert.match(correo.asunto, /^123456 /);
  assert.ok(correo.html.includes('El &lt;Golazo&gt; Club') && correo.html.includes('Hola, Ana:'));

  let peticion;
  const fetchOk = async (url, init) => { peticion = { url, init, body: JSON.parse(init.body) }; return new Response('{}', { status: 201 }); };
  await correoLib.enviarCorreo(correo, { brevoApiKey: 'xkeysib', remitente: 'club@gmail.com', remitenteNombre: 'Club' }, fetchOk);
  assert.equal(peticion.url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(peticion.init.headers['api-key'], 'xkeysib');
  assert.deepEqual(peticion.body.sender, { name: 'Club', email: 'club@gmail.com' });
  assert.deepEqual(peticion.body.to, [{ email: 'ana@gmail.com' }]);

  await correoLib.enviarCorreo(correo, { resendApiKey: 're_x', remitenteNombre: 'Club' }, fetchOk);
  assert.equal(peticion.url, 'https://api.resend.com/emails');
  assert.equal(peticion.body.from, 'Club <onboarding@resend.dev>');
  assert.equal(peticion.init.headers.Authorization, 'Bearer re_x');

  const fetchMal = async () => new Response('{"message":"unauthorized"}', { status: 401 });
  await assert.rejects(correoLib.enviarCorreo(correo, { resendApiKey: 're_x', remitenteNombre: 'C' }, fetchMal), (e) => e.statusCode === 502);
  await assert.rejects(correoLib.enviarCorreo(correo, { remitenteNombre: 'C' }, fetchOk), (e) => e.statusCode === 503);
  await assert.rejects(correoLib.enviarCorreo(correo, { brevoApiKey: 'k', remitenteNombre: 'C' }, fetchOk), (e) => e.statusCode === 503);
});
