const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL ??= 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY ??= 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'admin-de-prueba';

const repository = require('../dist/modules/usuarios/usuarios.repository');
const service = require('../dist/modules/usuarios/usuarios.service');

const filas = [
  { id: 'u-adm', usuario: 'admin', email: 'admin@club.pe', nombre: 'Admin', rol: 'ADM', activo: true, created_at: '2026-10-01T00:00:00Z', estudiante_id: null, profesor_id: null },
  { id: 'u-prof', usuario: 'profe', email: 'profe@club.pe', nombre: 'Luis Profe', rol: 'PROF', activo: true, created_at: '2026-10-02T00:00:00Z', estudiante_id: null, profesor_id: 'p1' },
  { id: 'u-alu', usuario: 'swiftdeskk', email: 'a@gmail.com', nombre: 'Arian Cerna', rol: 'ALU', activo: false, created_at: '2026-11-10T00:00:00Z', estudiante_id: 'e1', profesor_id: null },
];

function mocks(t, { accesoFalla = false } = {}) {
  t.mock.method(repository, 'listarUsuarios', async () => filas);
  t.mock.method(repository, 'categoriasDeAlumnos', async (ids) => new Map(ids.includes('e1') ? [['e1', 'Sub-19 masculino']] : []));
  t.mock.method(repository, 'categoriasDeProfesores', async (ids) => new Map(ids.includes('p1') ? [['p1', ['Sub-14 masculino', 'Sub-16 femenino']]] : []));
  t.mock.method(repository, 'datosDeAcceso', async () => {
    if (accesoFalla) throw new Error('auth caído');
    return new Map([['u-alu', { ultimoAcceso: '2026-11-14T20:00:00Z', proveedores: ['google'] }]]);
  });
}

test('USR-04 lista todas las cuentas con rol, categorías y datos de acceso', async (t) => {
  mocks(t);
  const usuarios = await service.listarUsuarios();
  assert.equal(usuarios.length, 3);
  const [adm, prof, alu] = usuarios;
  assert.deepEqual(adm.categorias, []);
  assert.deepEqual(prof.categorias, ['Sub-14 masculino', 'Sub-16 femenino']);
  assert.deepEqual(alu, {
    id: 'u-alu', usuario: 'swiftdeskk', nombre: 'Arian Cerna', email: 'a@gmail.com', rol: 'ALU', activo: false,
    createdAt: '2026-11-10T00:00:00Z', categorias: ['Sub-19 masculino'], ultimoAcceso: '2026-11-14T20:00:00Z', proveedores: ['google'],
  });
  assert.equal('estudiante_id' in alu, false);
});

test('USR-04 si Supabase Auth falla, la lista sale igual sin último ingreso', async (t) => {
  mocks(t, { accesoFalla: true });
  const usuarios = await service.listarUsuarios();
  assert.equal(usuarios.length, 3);
  assert.equal(usuarios[2].ultimoAcceso, null);
});

test('Categorías de la sesión: alumno la suya, profesor las asignadas, admin ninguna', async (t) => {
  mocks(t);
  assert.deepEqual(await service.categoriasDeSesion({ rol: 'ALU', estudianteId: 'e1' }), ['Sub-19 masculino']);
  assert.deepEqual(await service.categoriasDeSesion({ rol: 'PROF', profesorId: 'p1' }), ['Sub-14 masculino', 'Sub-16 femenino']);
  assert.deepEqual(await service.categoriasDeSesion({ rol: 'ADM' }), []);
  assert.deepEqual(await service.categoriasDeSesion({ rol: 'PROF' }), []);
});
