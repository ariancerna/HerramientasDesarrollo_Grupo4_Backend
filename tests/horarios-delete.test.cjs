const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createFixture, ids } = require('./helpers/horarios-fixture.cjs');

test('DELETE returns 204, no body, and deletes only the nested schedule', async (t) => {
  const fixture = await createFixture(t);
  const result = await fixture.request('DELETE');
  assert.equal(result.status, 204);
  assert.equal(result.text, '');
  assert.deepEqual(fixture.rows.horarios.map((row) => row.id), [ids.otroHorario]);
  const write = fixture.calls.find((call) => call.method === 'DELETE');
  assert.equal(write.params.get('id'), 'eq.' + ids.horario);
  assert.equal(write.params.get('categoria_id'), 'eq.' + ids.categoria);
});

for (const [label, params] of [
  ['missing category', { categoria: ids.inexistente }],
  ['missing schedule', { horario: ids.inexistente }],
  ['schedule belonging to another category', { horario: ids.otroHorario }],
]) {
  test('DELETE returns 404 for ' + label + ' without deleting existing schedules', async (t) => {
    const fixture = await createFixture(t);
    assert.equal((await fixture.request('DELETE', params)).status, 404);
    assert.equal(fixture.rows.horarios.length, 2);
    if (params.categoria) assert.equal(fixture.calls.some((call) => call.method === 'DELETE'), false);
  });
}

test('DELETE repeated on an absent schedule returns 404', async (t) => {
  const fixture = await createFixture(t);
  assert.equal((await fixture.request('DELETE')).status, 204);
  assert.equal((await fixture.request('DELETE')).status, 404);
  assert.equal(fixture.rows.horarios.length, 1);
});

for (const [token, status] of [
  [null, 401], ['invalid', 401], ['profesor', 403], ['alumno', 403], ['inactivo', 403],
]) {
  test('DELETE rejects unauthorized token ' + token, async (t) => {
    const fixture = await createFixture(t);
    assert.equal((await fixture.request('DELETE', { token })).status, status);
    assert.equal(fixture.calls.some((call) => call.table !== 'usuarios'), false);
    assert.equal(fixture.rows.horarios.length, 2);
  });
}

for (const params of [{ categoria: 'invalid' }, { horario: 'invalid' }]) {
  test('DELETE validates UUID path ' + JSON.stringify(params), async (t) => {
    const fixture = await createFixture(t);
    assert.equal((await fixture.request('DELETE', params)).status, 400);
    assert.equal(fixture.calls.some((call) => call.table !== 'usuarios'), false);
  });
}

test('DELETE maps foreign key violations to 409 without leaking database details', async (t) => {
  const fixture = await createFixture(t, { error: { method: 'DELETE', code: '23503' } });
  const result = await fixture.request('DELETE');
  assert.equal(result.status, 409);
  assert.equal(result.json.error.code, 'CONFLICT');
  assert.equal(result.text.includes('private'), false);
  assert.equal(fixture.rows.horarios.length, 2);
});

test('DELETE masks unexpected database failures as 500', async (t) => {
  t.mock.method(console, 'error', () => {});
  const fixture = await createFixture(t, { error: { method: 'DELETE', code: 'XX000' } });
  const result = await fixture.request('DELETE');
  assert.equal(result.status, 500);
  assert.equal(result.json.error.code, 'INTERNAL_ERROR');
  assert.equal(result.text.includes('private'), false);
});
