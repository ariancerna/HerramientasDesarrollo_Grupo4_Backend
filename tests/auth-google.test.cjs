const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://proyecto.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'admin-de-prueba';

const { ApiError } = require('../dist/lib/errors/api-error');
const { crearLoginGoogle, urlAutorizacionGoogle } = require('../dist/modules/auth/auth.google');
const { googleUrlQuerySchema, googleLoginSchema } = require('../dist/modules/auth/auth.schema');

const authGoogle = { id: 'auth-nuevo', email: 'Ana.Torres@gmail.com' };

function deps(overrides = {}) {
  const registro = { eliminados: [], creados: [], revocados: [] };
  return {
    registro,
    obtenerUsuarioAuth: async () => authGoogle,
    buscarCuentaPorId: async () => null,
    buscarCuentaPorEmail: async () => null,
    buscarAlumnoSinCuentaPorEmail: async () => null,
    usuarioExiste: async () => false,
    crearCuentaAlumno: async (d) => { registro.creados.push(d); },
    eliminarUsuarioAuth: async (id) => { registro.eliminados.push(id); },
    revocarSesion: async (t) => { registro.revocados.push(t); },
    ...overrides,
  };
}

test('AUTH-12 arma la URL de Supabase con proveedor Google y redirectTo', () => {
  const { url } = urlAutorizacionGoogle('http://localhost:3000/auth/callback', 'https://proyecto.supabase.co');
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, 'https://proyecto.supabase.co/auth/v1/authorize');
  assert.equal(parsed.searchParams.get('provider'), 'google');
  assert.equal(parsed.searchParams.get('redirect_to'), 'http://localhost:3000/auth/callback');
  assert.equal(googleUrlQuerySchema.safeParse({ redirectTo: 'javascript:alert(1)' }).success, false);
  assert.equal(googleLoginSchema.safeParse({ accessToken: 'a' }).success, false);
});

test('AUTH-13 cuenta ya vinculada (mismo id): entra con su rol y no borra nada', async () => {
  const d = deps({
    buscarCuentaPorId: async () => ({ id: 'auth-nuevo', usuario: 'admin', email: 'x', nombre: 'Admin', rol: 'ADM', estudiante_id: null, activo: true }),
  });
  const r = await crearLoginGoogle(d).login('acc', 'ref');
  assert.deepEqual(r, { accessToken: 'acc', refreshToken: 'ref', usuario: { id: 'auth-nuevo', usuario: 'admin', nombre: 'Admin', rol: 'ADM' } });
  assert.deepEqual(d.registro.eliminados, []);
});

test('AUTH-13 alumno inscrito sin cuenta: crea su cuenta con un usuario libre', async () => {
  const d = deps({
    buscarAlumnoSinCuentaPorEmail: async () => ({ id: 'alu-1', nombres: 'Ana', apellidos: 'Torres', email: 'ana.torres@gmail.com' }),
    usuarioExiste: async (u) => u === 'ana.torres',
  });
  const r = await crearLoginGoogle(d).login('acc', 'ref');
  assert.equal(d.registro.creados[0].usuario, 'ana.torres2');
  assert.equal(d.registro.creados[0].id, 'auth-nuevo');
  assert.equal(d.registro.creados[0].estudianteId, 'alu-1');
  assert.deepEqual(r.usuario, { id: 'auth-nuevo', usuario: 'ana.torres2', nombre: 'Ana Torres', rol: 'ALU', estudianteId: 'alu-1' });
});

test('AUTH-13 correo ajeno al club: 403 y elimina el usuario creado por Google', async () => {
  const d = deps();
  await assert.rejects(crearLoginGoogle(d).login('acc', 'ref'), (e) => e instanceof ApiError && e.statusCode === 403);
  assert.deepEqual(d.registro.eliminados, ['auth-nuevo']);
});

test('AUTH-13 correo con cuenta de otro id: 409 sin tocar la cuenta existente', async () => {
  const d = deps({ buscarCuentaPorEmail: async () => ({ id: 'otro-id', activo: true }) });
  await assert.rejects(crearLoginGoogle(d).login('acc', 'ref'), (e) => e.statusCode === 409);
  assert.deepEqual(d.registro.eliminados, ['auth-nuevo']);
});

test('AUTH-13 token inválido: 401; cuenta deshabilitada: 403 y revoca la sesión', async () => {
  await assert.rejects(crearLoginGoogle(deps({ obtenerUsuarioAuth: async () => null })).login('x', 'y'), (e) => e.statusCode === 401);
  const d = deps({ buscarCuentaPorId: async () => ({ id: 'auth-nuevo', usuario: 'p', email: 'x', nombre: 'P', rol: 'PROF', estudiante_id: null, activo: false }) });
  await assert.rejects(crearLoginGoogle(d).login('acc', 'ref'), (e) => e.statusCode === 403);
  assert.deepEqual(d.registro.revocados, ['acc']);
  assert.deepEqual(d.registro.eliminados, []);
});

test('AUTH-13 si falla la creación de la cuenta informa el motivo y limpia el usuario de Google', async (t) => {
  t.mock.method(console, 'error', () => {});
  const d = deps({
    buscarAlumnoSinCuentaPorEmail: async () => ({ id: 'alu-1', nombres: 'Ana', apellidos: 'Torres', email: 'ana@gmail.com' }),
    crearCuentaAlumno: async () => { throw { code: 'PGRST202', message: 'Could not find the function' }; },
  });
  await assert.rejects(crearLoginGoogle(d).login('acc', 'ref'),
    (e) => e.statusCode === 409 && e.message.includes('falta la función crear_cuenta_alumno'));
  assert.deepEqual(d.registro.eliminados, ['auth-nuevo']);
});
