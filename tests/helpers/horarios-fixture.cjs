'use strict';

// Override credentials before loading backend modules: tests never use the real project.
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://horarios.test';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const { supabaseAdmin, supabaseAnon } = require('../../dist/config/supabase');
const apiRouter = require('../../dist/routes').default;
const { errorMiddleware } = require('../../dist/middlewares/error.middleware');

const ids = {
  categoria: '11111111-1111-4111-8111-111111111111',
  otraCategoria: '22222222-2222-4222-8222-222222222222',
  horario: '33333333-3333-4333-8333-333333333333',
  otroHorario: '44444444-4444-4444-8444-444444444444',
  inexistente: '55555555-5555-4555-8555-555555555555',
};

async function createFixture(t, options = {}) {
  const calls = [];
  const rows = {
    categorias: [{ id: ids.categoria }, { id: ids.otraCategoria }],
    horarios: [
      { id: ids.horario, categoria_id: ids.categoria, dia: 'lunes',
        hora_inicio: '18:00:00', hora_fin: '20:00:00', cancha: 'Cancha 1',
        estado: 'activo', created_at: '2026-10-11T00:00:00Z' },
      { id: ids.otroHorario, categoria_id: ids.otraCategoria, dia: 'martes',
        hora_inicio: '17:00:00', hora_fin: '19:00:00', cancha: null,
        estado: 'activo', created_at: '2026-10-11T00:00:00Z' },
    ],
    usuarios: [
      { id: 'admin', rol: 'ADM', activo: true },
      { id: 'profesor', rol: 'PROF', activo: true },
      { id: 'alumno', rol: 'ALU', activo: true },
      { id: 'inactivo', rol: 'ADM', activo: false },
    ],
  };
  const client = createClient('https://horarios.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(input);
      assertLocalUrl(url);
      const table = url.pathname.split('/').at(-1);
      if (!Object.hasOwn(rows, table)) throw new Error('Unexpected table: ' + table);
      const method = init.method;
      const body = init.body ? JSON.parse(init.body) : undefined;
      calls.push({ table, method, params: new URLSearchParams(url.searchParams), body });
      if (options.error && table === 'horarios' && method === options.error.method) {
        return new Response(JSON.stringify({ code: options.error.code,
          message: 'private database detail' }), { status: 400 });
      }
      const matches = (row) => [...url.searchParams].every(([key, value]) =>
        ['select', 'order'].includes(key) || (value.startsWith('eq.') && String(row[key]) === value.slice(3)));
      let data = rows[table].filter(matches);
      if (method === 'DELETE') {
        rows[table] = rows[table].filter((row) => !matches(row));
      } else if (method === 'PATCH') {
        if (options.beforeUpdate) options.beforeUpdate(rows);
        data = rows[table].filter(matches);
        const updates = data.map((row) => ({ ...row, ...body }));
        if (updates.some((row) => row.hora_fin <= row.hora_inicio)) {
          return new Response(JSON.stringify({ code: '23514', message: 'private constraint' }),
            { status: 400 });
        }
        for (const row of data) Object.assign(row, body);
      }
      const select = url.searchParams.get('select');
      if (select && !select.includes('*')) {
        data = data.map((row) => Object.fromEntries(select.split(',').map((key) => [key, row[key]])));
      }
      const headers = new Headers(init.headers);
      if (headers.get('accept')?.includes('application/vnd.pgrst.object+json')) {
        if (data.length !== 1) {
          return new Response(JSON.stringify({ code: 'PGRST116', details: 'The result contains 0 rows' }),
            { status: 406 });
        }
        data = data[0];
      }
      return new Response(JSON.stringify(data), { status: 200,
        headers: { 'Content-Type': 'application/json' } });
    } },
  });
  t.mock.method(supabaseAdmin, 'from', (table) => client.from(table));
  t.mock.method(supabaseAnon.auth, 'getUser', async (token) => ({
    data: { user: rows.usuarios.some((row) => row.id === token) ? { id: token } : null },
    error: null,
  }));
  const app = express();
  app.use(express.json());
  app.use('/api/v1', apiRouter);
  app.use(errorMiddleware);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = 'http://127.0.0.1:' + server.address().port;
  return {
    rows, calls, client,
    async request(method, { categoria = ids.categoria, horario = ids.horario,
      token = 'admin', body, rawBody } = {}) {
      const headers = {};
      if (token !== null) headers.Authorization = 'Bearer ' + token;
      if (body !== undefined || rawBody !== undefined) headers['Content-Type'] = 'application/json';
      const response = await fetch(base + '/api/v1/categorias/' + categoria + '/horarios/' + horario, {
        method, headers, body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
      });
      const text = await response.text();
      return { status: response.status, text, json: text ? JSON.parse(text) : undefined };
    },
  };
}

function assertLocalUrl(url) {
  if (url.origin !== 'https://horarios.test' || !url.pathname.startsWith('/rest/v1/')) {
    throw new Error('Unexpected network request');
  }
}

module.exports = { createFixture, ids };
