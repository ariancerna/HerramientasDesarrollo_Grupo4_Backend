const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL ??= 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY ??= 'anon-de-prueba';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'admin-de-prueba';

const repo = require('../dist/modules/anuncios/anuncios.repository');
const anuncios = require('../dist/modules/anuncios/anuncios.service');

const prof = { id: 'u1', rol: 'PROF', profesorId: 'p1' };
const fila = { id: 'an1', profesor_id: 'p1', titulo: 'Evaluación física', mensaje: 'texto', categoria_id: null, estado: 'enviado', created_at: '2026-11-20T00:00:00Z', enviado_at: '2026-11-20T00:00:00Z' };

function mocks(t) {
  t.mock.method(repo, 'findById', async () => fila);
  const update = t.mock.method(repo, 'update', async (id, cambios) => ({ ...fila, ...cambios }));
  const reemplazar = t.mock.method(repo, 'reemplazarDestinatarios', async () => {});
  t.mock.method(repo, 'destinatarios', async () => new Map([['an1', ['a1']]]));
  t.mock.method(repo, 'nombres', async () => ({ profesores: new Map([['p1', 'Carla Mendoza']]), categorias: new Map() }));
  return { update, reemplazar };
}

test('ANU-03 un anuncio enviado permite corregir el título y el mensaje', async (t) => {
  const { update } = mocks(t);
  const r = await anuncios.editar(prof, 'an1', { titulo: 'Evaluación física trimestral', mensaje: 'El 18 de noviembre...' });
  assert.equal(r.titulo, 'Evaluación física trimestral');
  assert.equal(update.mock.callCount(), 1);
});

test('ANU-03 un anuncio enviado no vuelve a borrador ni cambia de destinatarios', async (t) => {
  const { update, reemplazar } = mocks(t);
  await assert.rejects(anuncios.editar(prof, 'an1', { estado: 'borrador' }), (e) => e.statusCode === 409);
  await assert.rejects(anuncios.editar(prof, 'an1', { destinatarios: ['11111111-1111-4111-8111-111111111111'] }), (e) => e.statusCode === 409 && /destinatarios/.test(e.message));
  assert.equal(update.mock.callCount(), 0);
  assert.equal(reemplazar.mock.callCount(), 0);
});
