import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv({ path: join(__dirname, '..', '.env'), quiet: true });

const OUT = join(__dirname, '..', '..', 'docs', 'SCHEMA.md');

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: 'YES' | 'NO';
  is_pk: boolean;
}

interface ForeignKeyRow {
  src: string;
  src_col: string;
  tgt: string;
  delete_rule: string;
}

const TYPE_ALIASES: Record<string, string> = {
  'timestamp with time zone': 'timestamptz',
  'character varying': 'varchar',
  integer: 'int',
  boolean: 'bool',
};

function shortType(row: ColumnRow): string {
  const raw = row.data_type === 'USER-DEFINED' ? row.udt_name : row.data_type;
  return (TYPE_ALIASES[raw] ?? raw).replace(/\s+/g, '_');
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Set it in api/.env before running db:erd.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const { rows: columns } = await client.query<ColumnRow>(`
      SELECT c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable,
             EXISTS (
               SELECT 1 FROM information_schema.table_constraints tc
               JOIN information_schema.key_column_usage k
                 ON k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema
               WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = c.table_name
                 AND k.column_name = c.column_name AND tc.table_schema = 'public'
             ) AS is_pk
        FROM information_schema.columns c
       WHERE c.table_schema = 'public' AND c.table_name <> 'schema_migrations'
       ORDER BY c.table_name, c.ordinal_position`);

    if (columns.length === 0) {
      throw new Error('No tables found in the public schema. Run pnpm migrate first.');
    }

    const { rows: fks } = await client.query<ForeignKeyRow>(`
      SELECT tc.table_name AS src, kcu.column_name AS src_col,
             ccu.table_name AS tgt, rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc
          ON rc.constraint_name = tc.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
       ORDER BY tc.table_name, kcu.column_name`);

    const byTable = new Map<string, ColumnRow[]>();
    for (const row of columns) {
      const list = byTable.get(row.table_name) ?? [];
      list.push(row);
      byTable.set(row.table_name, list);
    }

    let diagram = 'erDiagram\n';
    for (const [table, rows] of byTable) {
      diagram += `    ${table} {\n`;
      for (const row of rows) {
        const marks = [row.is_pk ? 'PK' : '', row.is_nullable === 'YES' ? '"nullable"' : '']
          .filter(Boolean)
          .join(' ');
        diagram += `        ${shortType(row)} ${row.column_name}${marks ? ` ${marks}` : ''}\n`;
      }
      diagram += '    }\n';
    }
    for (const fk of fks) {
      const suffix = fk.delete_rule === 'SET NULL' ? ' (nullable)' : '';
      diagram += `    ${fk.tgt} ||--o{ ${fk.src} : "${fk.src_col}${suffix}"\n`;
    }

    writeFileSync(OUT, render(diagram), 'utf8');
    console.log(`Wrote ${OUT} (${byTable.size} tables, ${fks.length} foreign keys)`);
  } finally {
    await client.end();
  }
}

function render(diagram: string): string {
  return `# Database schema

Source of truth is \`api/migrations/*.sql\`. This document is **generated from the
live database** (\`pnpm --dir api db:erd\`) so it cannot silently drift from what
is actually deployed.

\`\`\`mermaid
${diagram}\`\`\`

## Notes

- **\`users\`** — email is unique case-insensitively (\`users_email_lower_key\` on
  \`lower(email)\`). \`password_hash\` is scrypt: \`scrypt$N$r$p$salt$hash\`.
- **\`sessions\`** — \`token_hash\` is the SHA-256 of the bearer token; the token
  itself is never stored. A session is live while \`revoked_at IS NULL AND
  expires_at > now()\`. Logout sets \`revoked_at\`.
- **\`profiles_cache\`** — shared across users, one row per \`public_id\`. \`raw\`
  keeps the untouched upstream payload so a corrected normaliser can re-run
  without refetching; \`schema_version\` records which normaliser produced
  \`normalised\`.
- **\`jobs\`** — one row per submission, and doubles as per-user search history
  (\`jobs_user_created_idx\` on \`user_id, created_at DESC\`). Claimed by the worker
  with \`FOR UPDATE SKIP LOCKED\` via \`jobs_claim_idx\`. \`profile_id\` is
  \`ON DELETE SET NULL\` so evicting a cache row does not delete history.
- Two users searching the same profile each get their own \`jobs\` row; duplicate
  fetch work is prevented at runtime by a \`pg_advisory_xact_lock\` on
  \`public_id\`, not by a unique constraint.

## Regenerating

\`\`\`bash
cd api && pnpm db:erd
\`\`\`
`;
}

main().catch((err: unknown) => {
  console.error('ERD generation failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
