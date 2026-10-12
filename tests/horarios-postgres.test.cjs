const { test } = require('node:test');
const assert = require('node:assert/strict');
const { postgresFixture } = require('./helpers/postgres-fixture.cjs');
test('HOR Postgres impide duplicar dia y duraciones invalidas', async (t) => {
  const db = await postgresFixture(t, ['_horarios_dia_unico.sql']);
  const { rows: [cat] } = await db.query("INSERT INTO categorias(nombre) VALUES ('Sub-12') RETURNING id");
  await db.query("INSERT INTO horarios(categoria_id, dia, hora_inicio, hora_fin) VALUES ($1, 'Lunes', '09:00', '11:00')", [cat.id]);
  await assert.rejects(db.query("INSERT INTO horarios(categoria_id, dia, hora_inicio, hora_fin) VALUES ($1, 'lunes', '12:00', '13:00')", [cat.id]), { code: '23505' });
  await assert.rejects(db.query("INSERT INTO horarios(categoria_id, dia, hora_inicio, hora_fin) VALUES ($1, 'Martes', '12:00', '11:00')", [cat.id]), { code: '23514' });
});
