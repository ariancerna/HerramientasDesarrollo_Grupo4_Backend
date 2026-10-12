const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
async function postgresFixture(t, migrationSuffix) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  const dir = path.join(__dirname, '../../supabase/migrations');
  const initial = fs.readFileSync(path.join(dir, '001_initial_schema.sql'), 'utf8').replace('create extension if not exists "pgcrypto";', '');
  await db.exec(initial);
  for (const suffix of migrationSuffix) {
    const file = fs.readdirSync(dir).find((name) => name.endsWith(suffix));
    await db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
  }
  return db;
}
module.exports = { postgresFixture };
