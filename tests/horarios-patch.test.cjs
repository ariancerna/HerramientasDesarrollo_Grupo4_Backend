const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createFixture, ids } = require('./helpers/horarios-fixture.cjs');

test('PATCH edits all supported fields and returns the saved camelCase DTO', async (t) => {
  const fixture = await createFixture(t);
  const result = await fixture.request('PATCH', { body: {
    dia: ' MIÉRCOLES ', horaInicio: '09:30', horaFin: '11:45',
    cancha: ' Cancha 2 ', estado: 'cancelado',
  } });
  assert.equal(result.status, 200);
  assert.deepEqual(result.json.data, {
    id: ids.horario, categoriaId: ids.categoria, dia: 'miércoles',
    horaInicio: '09:30', horaFin: '11:45', cancha: 'Cancha 2',
    estado: 'cancelado', createdAt: '2026-10-11T00:00:00Z',
  });
  const write = fixture.calls.find((call) => call.method === 'PATCH');
  assert.equal(write.params.get('id'), 'eq.' + ids.horario);
  assert.equal(write.params.get('categoria_id'), 'eq.' + ids.categoria);
  assert.deepEqual(write.body, {
    dia: 'Miércoles', hora_inicio: '09:30:00', hora_fin: '11:45:00',
    cancha: 'Cancha 2', estado: 'cancelado',
  });
  assert.equal(fixture.rows.horarios[1].estado, 'activo');
});

for (const estado of ['cancelado', 'activo']) {
  test('PATCH allows state-only changes to ' + estado + ' without overwriting other fields', async (t) => {
    const fixture = await createFixture(t);
    fixture.rows.horarios[0].estado = estado === 'activo' ? 'cancelado' : 'activo';
    const before = { ...fixture.rows.horarios[0] };
    const result = await fixture.request('PATCH', { body: { estado } });
    assert.equal(result.status, 200);
    assert.deepEqual(fixture.rows.horarios[0], { ...before, estado });
    assert.deepEqual(fixture.calls.find((call) => call.method === 'PATCH').body, { estado });
  });
}

for (const body of [{ cancha: null }, { dia: 'sábado' }, { cancha: 'Nueva cancha' },
  { horaInicio: '17:00' }, { horaFin: '21:00' }]) {
  test('PATCH supports a single-field update ' + JSON.stringify(body), async (t) => {
    const fixture = await createFixture(t);
    const result = await fixture.request('PATCH', { body });
    assert.equal(result.status, 200);
    assert.equal(Object.keys(fixture.calls.find((call) => call.method === 'PATCH').body).length, 1);
    if (body.cancha === null) assert.equal(result.json.data.cancha, null);
  });
}

test('PATCH preserves significant seconds and accepts midnight boundaries', async (t) => {
  const fixture = await createFixture(t);
  const result = await fixture.request('PATCH', {
    body: { horaInicio: '00:00', horaFin: '23:59:59' },
  });
  assert.equal(result.status, 200);
  assert.equal(result.json.data.horaInicio, '00:00');
  assert.equal(result.json.data.horaFin, '23:59:59');
});

for (const body of [
  { horaInicio: '20:00' }, { horaInicio: '21:00' }, { horaFin: '18:00' },
  { horaFin: '17:59:59' }, { horaInicio: '23:00', horaFin: '01:00' },
  { horaInicio: '10:00', horaFin: '10:00' },
]) {
  test('PATCH rejects an invalid resulting time interval ' + JSON.stringify(body), async (t) => {
    const fixture = await createFixture(t);
    assert.equal((await fixture.request('PATCH', { body })).status, 400);
    assert.equal(fixture.calls.some((call) => call.method === 'PATCH'), false);
    assert.equal(fixture.rows.horarios[0].hora_inicio, '18:00:00');
  });
}

const invalidBodies = [
  {}, [], null, 'invalid', { estado: 'pendiente' }, { estado: null },
  { dia: 'feriado' }, { dia: null }, { horaInicio: '24:00' },
  { horaFin: '12:60' }, { horaInicio: '9:00' }, { horaFin: '10:00:60' },
  { horaInicio: 900 }, { horaInicio: null }, { cancha: '   ' },
  { cancha: 'x'.repeat(201) }, { cancha: 1 }, { categoriaId: ids.otraCategoria },
  { id: ids.otroHorario }, { createdAt: '2026-10-12' },
  { estado: 'activo', hora_inicio: '09:00' },
];
for (const [index, body] of invalidBodies.entries()) {
  test('PATCH rejects invalid/unknown request fields #' + index, async (t) => {
    const fixture = await createFixture(t);
    assert.equal((await fixture.request('PATCH', { body })).status, 400);
    assert.equal(fixture.calls.some((call) => call.table !== 'usuarios'), false);
  });
}

test('PATCH requires at least one field and explains the empty body error', async (t) => {
  const fixture = await createFixture(t);
  const result = await fixture.request('PATCH');
  assert.equal(result.status, 400);
  assert.match(result.json.error.details._form.join(' '), /al menos un campo/);
});

for (const [label, params] of [
  ['missing category', { categoria: ids.inexistente }],
  ['missing schedule', { horario: ids.inexistente }],
  ['schedule in another category', { horario: ids.otroHorario }],
]) {
  test('PATCH returns 404 for ' + label + ' without any write', async (t) => {
    const fixture = await createFixture(t);
    assert.equal((await fixture.request('PATCH', { ...params, body: { estado: 'cancelado' } })).status, 404);
    assert.equal(fixture.calls.some((call) => call.method === 'PATCH'), false);
    assert.ok(fixture.rows.horarios.every((row) => row.estado === 'activo'));
  });
}

for (const [token, status] of [
  [null, 401], ['invalid', 401], ['profesor', 403], ['alumno', 403], ['inactivo', 403],
]) {
  test('PATCH enforces authentication and ADM role for token ' + token, async (t) => {
    const fixture = await createFixture(t);
    assert.equal((await fixture.request('PATCH', { token, body: { estado: 'cancelado' } })).status, status);
    assert.equal(fixture.calls.some((call) => call.table !== 'usuarios'), false);
  });
}

for (const params of [{ categoria: 'invalid' }, { horario: 'invalid' }]) {
  test('PATCH validates UUID path ' + JSON.stringify(params), async (t) => {
    const fixture = await createFixture(t);
    assert.equal((await fixture.request('PATCH', { ...params, body: { estado: 'activo' } })).status, 400);
    assert.equal(fixture.calls.some((call) => call.table !== 'usuarios'), false);
  });
}

test('PATCH returns 404 when the row disappears between read and write', async (t) => {
  const fixture = await createFixture(t, { beforeUpdate: (rows) => {
    rows.horarios = rows.horarios.filter((row) => row.id !== ids.horario);
  } });
  assert.equal((await fixture.request('PATCH', { body: { estado: 'cancelado' } })).status, 404);
  assert.equal(fixture.rows.horarios[0].id, ids.otroHorario);
});

test('PATCH maps the database time constraint to 400 even after a concurrent change', async (t) => {
  const fixture = await createFixture(t, { beforeUpdate: (rows) => {
    rows.horarios[0].hora_inicio = '16:00:00';
    rows.horarios[0].hora_fin = '17:00:00';
  } });
  const result = await fixture.request('PATCH', { body: { horaInicio: '17:30' } });
  assert.equal(result.status, 400);
  assert.equal(result.text.includes('private'), false);
  assert.equal(fixture.rows.horarios[0].hora_inicio, '16:00:00');
});

test('PATCH masks unexpected database errors as 500', async (t) => {
  t.mock.method(console, 'error', () => {});
  const fixture = await createFixture(t, { error: { method: 'PATCH', code: 'XX000' } });
  const result = await fixture.request('PATCH', { body: { estado: 'cancelado' } });
  assert.equal(result.status, 500);
  assert.equal(result.text.includes('private'), false);
  assert.equal(fixture.rows.horarios[0].estado, 'activo');
});

test('PATCH returns 400 for malformed JSON without database access or leaked details', async (t) => {
  const fixture = await createFixture(t);
  const result = await fixture.request('PATCH', { rawBody: '{"estado":' });
  assert.equal(result.status, 400);
  assert.equal(result.json.error.code, 'BAD_REQUEST');
  assert.equal(fixture.calls.length, 0);
  assert.equal(result.text.includes('SyntaxError'), false);
});

test('PATCH returns 413 for an oversized body without database access', async (t) => {
  const fixture = await createFixture(t);
  const result = await fixture.request('PATCH', { body: { cancha: 'x'.repeat(110000) } });
  assert.equal(result.status, 413);
  assert.equal(result.json.error.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(fixture.calls.length, 0);
});
