import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv({ path: join(__dirname, '..', '.env'), quiet: true });

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

const LEDGER_DDL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   TEXT        PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Set it in api/.env before running migrations.');
  }

  const all = migrationFiles();
  if (all.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(LEDGER_DDL);

    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations',
    );
    const applied = new Set(rows.map((r) => r.filename));
    const pending = all.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log(`Up to date — ${applied.size} migration(s) already applied.`);
      return;
    }

    if (dryRun) {
      console.log(`${pending.length} pending migration(s):`);
      pending.forEach((f) => console.log(`  - ${f}`));
      return;
    }

    for (const filename of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8');
      process.stdout.write(`Applying ${filename} ... `);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log('ok');
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('failed');
        throw err;
      }
    }

    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
