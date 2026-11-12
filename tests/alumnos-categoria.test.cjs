const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL ??= 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY ??= 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'admin-de-prueba';

const { supabaseAdmin } = require('../dist/config/supabase');
const repository = require('../dist/modules/alumnos/alumnos.repository');

const fila = { id: 'a1', dni: '99999899', nombres: 'Alumno', apellidos: 'De Prueba', estado: 'activo', categoria_id: 'c1', categorias: { id: 'c1', nombre: 'Sub-14 masculino' } };

function consultaFalsa(selecciones) {
  const q = {
    select: (columnas) => { selecciones.push(columnas); return q; },
    eq: () => q,
    insert: () => q,
    update: () => q,
    single: async () => ({ data: fila, error: null }),
    maybeSingle: async () => ({ data: fila, error: null }),
  };
  return q;
}

test('ALU: buscar por DNI o id trae el nombre de la categoría (registro de asistencia)', async (t) => {
  const selecciones = [];
  t.mock.method(supabaseAdmin, 'from', () => consultaFalsa(selecciones));

  const porDni = repository.presentAlumno(await repository.findByDni('99999899'));
  const porId = repository.presentAlumno(await repository.findById('a1'));
  await repository.create({ dni: '1' });
  await repository.update('a1', { telefono: '9' });

  assert.equal(porDni.categoria, 'Sub-14 masculino');
  assert.equal(porId.categoria, 'Sub-14 masculino');
  assert.equal(selecciones.length, 4);
  for (const columnas of selecciones) assert.match(columnas, /categorias/);
});
