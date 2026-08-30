# Unfurl

Fetch, cache and serve LinkedIn profiles. Users sign in, submit a profile URL,
and get a normalised profile plus a per-user search history.

`api/` NestJS + TypeScript · `web/` Next.js App Router + Tailwind · Postgres (Neon)
Package manager: **pnpm** (pinned per app via `packageManager`).

## Naming conventions

| Thing | Casing | Example |
| ----- | ------ | ------- |
| Postgres tables | `snake_case`, plural | `profiles_cache`, `cors_origins` |
| Postgres columns | `snake_case` | `token_hash`, `expires_at` |
| Indexes | `<table>_<cols>_idx` | `jobs_user_created_idx` |
| Unique indexes | `<table>_<cols>_key` | `cors_origins_origin_key` |
| **JSON API fields** | `snake_case` | `job_id`, `session_valid`, `from_cache` |
| TS variables / functions | `camelCase` | `sessionTtlHours`, `parsePublicId` |
| TS classes / interfaces / types / enums | `PascalCase` | `SearchesService`, `NormalisedProfile` |
| Module-level constants | `SCREAMING_SNAKE_CASE` | `POLL_INTERVAL_MS` |
| `api/` filenames | `kebab-case.<role>.ts` | `job-processor.service.ts` |
| `web/` component files | `PascalCase.tsx` (one main component) | `ProfileCard.tsx` |
| `web/` shared modules | `kebab-case.ts` / lowercase | `route-helpers.ts`, `ui.tsx` |
| Prisma models / fields | `snake_case`, mirroring the table and column names exactly (no `@map`) | `model profiles_cache` |
| Env variables | `SCREAMING_SNAKE_CASE` | `DIRECT_DATABASE_URL` |

The **snake_case JSON boundary is deliberate**: the wire contract matches the
database, while TypeScript internals stay `camelCase`. Do not "fix" one to match
the other — map at the edge.

Database **row types** (`UserRow`, `JobRow`, `CorsOriginRow`, …) use
`snake_case` fields because they are literally what `pg` returns. Types that are
not rows — `AuthenticatedUser`, service arguments — stay `camelCase`.

`prisma/schema.prisma` is a 1:1 mirror: `model jobs`, field `public_id`. It is
read by people, not by a generated client, so mapping to `PascalCase` would only
hide the real names.

## Invariants

- **Migrations are raw SQL** in `api/migrations/`, applied by `pnpm migrate`.
  Prisma is a schema *view* only — never run `prisma migrate`. Two migration
  systems on one database fight over ownership.
- **Never edit an applied migration.** Add the next numbered file.
- **The worker is a separate process** (`dist/worker.js`). Queue consumers never
  run on the API deployable.
- **The queue is Postgres**, claimed with `FOR UPDATE SKIP LOCKED`. No Redis,
  BullMQ or broker.
- **Session tokens are never stored** — only `sha256(token)`, on the `users`
  row (`session_token_hash`). One session per user: a new login overwrites it.
- **The browser never calls `api/` directly** and never sees the session token.
  It talks to `web`'s own `/api/*` route handlers, which attach the token from an
  httpOnly cookie.
- **CORS lives in the `cors_origins` table**, not an env var. It fails closed if
  the allowlist has never loaded.
- **Secrets only in `.env`** (gitignored). `.env.example` stays blank and
  committed. Never put a credential in `docker-compose.yml` or any tracked file.
- Pin dependency versions exactly; no `^` or `~`.

## Commands

```bash
cd api
pnpm start:dev      # API on :3001
pnpm worker:dev     # worker (required, or searches sit at "queued")
pnpm migrate        # apply SQL migrations
pnpm db:diff        # SQL needed to match prisma/schema.prisma
pnpm db:studio      # visual table browser
pnpm db:erd         # regenerate docs/SCHEMA.md

cd web
pnpm dev            # web on :3000
```

## Comments

Keep them rare. Comment only non-obvious *why* — a constraint someone could
break by accident. Do not restate what the code says.
