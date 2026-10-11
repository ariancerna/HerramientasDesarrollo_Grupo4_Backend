const { createClient } = require('@supabase/supabase-js');

function splitTerms(expression) {
  const terms = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < expression.length; i += 1) {
    if (expression[i] === '(') depth += 1;
    if (expression[i] === ')') depth -= 1;
    if (expression[i] === ',' && depth === 0) {
      terms.push(expression.slice(start, i));
      start = i + 1;
    }
  }
  terms.push(expression.slice(start));
  return terms;
}

function compare(value, expression) {
  const index = expression.indexOf('.');
  const operator = expression.slice(0, index);
  const expected = expression.slice(index + 1);
  if (operator === 'not') return !compare(value, expected);
  if (operator === 'is') return expected === 'null' ? value == null : String(value) === expected;
  if (value == null) return false;
  if (operator === 'eq') return String(value) === expected;
  if (operator === 'in') return expected.slice(1, -1).split(',').includes(String(value));
  if (operator === 'gt') return String(value) > expected;
  if (operator === 'gte') return String(value) >= expected;
  if (operator === 'lt') return String(value) < expected;
  if (operator === 'lte') return String(value) <= expected;
  throw new Error(`Operador no soportado en la prueba: ${operator}`);
}

function matches(row, term) {
  if (term.startsWith('and(')) return splitTerms(term.slice(4, -1)).every((item) => matches(row, item));
  if (term.startsWith('or(')) return splitTerms(term.slice(3, -1)).some((item) => matches(row, item));
  const index = term.indexOf('.');
  return compare(row[term.slice(0, index)], term.slice(index + 1));
}

/** Usa el SDK real y simula únicamente HTTP de PostgREST; nunca envía datos a Supabase. */
function databaseFixture(tables = {}) {
  const requests = [];
  const failures = new Set();
  const client = createClient('https://dashboard.test', 'clave-de-prueba', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, options) => {
        const url = new URL(input);
        const table = url.pathname.split('/').at(-1);
        requests.push({ table, params: url.searchParams, method: options.method });
        if (failures.has(table)) return new Response(JSON.stringify({ code: 'TEST_DB_ERROR', message: 'Fallo simulado de base de datos' }), { status: 500 });
        let rows = [...(tables[table] ?? [])];
        for (const [key, value] of url.searchParams) {
          if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
          if (key === 'or') rows = rows.filter((row) => splitTerms(value.slice(1, -1)).some((term) => matches(row, term)));
          else rows = rows.filter((row) => compare(row[key], value));
        }
        const total = rows.length;
        const order = url.searchParams.get('order');
        if (order) {
          const fields = order.split(',').map((item) => item.split('.'));
          rows.sort((a, b) => {
            for (const [key, direction] of fields) {
              const result = String(a[key] ?? '').localeCompare(String(b[key] ?? ''));
              if (result) return direction === 'desc' ? -result : result;
            }
            return 0;
          });
        }
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const limit = Number(url.searchParams.get('limit') ?? 1000);
        rows = rows.slice(offset, offset + limit);
        const fields = url.searchParams.get('select');
        if (fields && fields !== '*') rows = rows.map((row) => Object.fromEntries(fields.split(',').map((field) => [field, row[field] ?? null])));
        const single = new Headers(options.headers).get('accept') === 'application/vnd.pgrst.object+json';
        if (single && rows.length !== 1) return new Response(JSON.stringify({ code: 'PGRST116', message: 'Expected one row' }), { status: 406 });
        return new Response(options.method === 'HEAD' ? null : JSON.stringify(single ? rows[0] : rows), {
          status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': `*/${total}` },
        });
      },
    },
  });
  return { client, tables, requests, failures };
}

module.exports = { databaseFixture };
