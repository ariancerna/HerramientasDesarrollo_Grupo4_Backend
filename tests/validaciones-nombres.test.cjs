const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL ??= 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY ??= 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'admin-de-prueba';

const { crearAlumnoSchema, actualizarPerfilAlumnoSchema } = require('../dist/modules/alumnos/alumnos.schema');
const { crearProfesorSchema } = require('../dist/modules/profesores/profesores.schema');

const alumno = { dni: '12345678', nombres: 'José Ñique', apellidos: "D'Angelo Pérez-Ruiz", email: 'a@b.pe', categoriaId: '11111111-1111-4111-8111-111111111111' };

test('Nombres de alumnos: letras con tildes, ñ, apóstrofo y guion; sin números ni símbolos', () => {
  assert.equal(crearAlumnoSchema.safeParse(alumno).success, true);
  for (const malo of ['Ana123', '@na', '1', ' ', 'A']) {
    assert.equal(crearAlumnoSchema.safeParse({ ...alumno, nombres: malo }).success, false, malo);
  }
  assert.equal(actualizarPerfilAlumnoSchema.safeParse({ apellidos: 'Torres 2' }).success, false);
  assert.equal(crearAlumnoSchema.safeParse({ ...alumno, nombres: 'x'.repeat(81) }).success, false);
});

test('Nombre de profesor: solo letras', () => {
  const base = { nombre: 'María Quispe', usuario: 'mquispe', email: 'm@b.pe', password: 'secreto1', sedeId: '11111111-1111-4111-8111-111111111111' };
  assert.equal(crearProfesorSchema.safeParse(base).success, true);
  assert.equal(crearProfesorSchema.safeParse({ ...base, nombre: 'Prof 123' }).success, false);
});
