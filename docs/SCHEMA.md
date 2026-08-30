# Database schema

Source of truth is `api/migrations/*.sql`. This document is **generated from the
live database** (`pnpm --dir api db:erd`) so it cannot silently drift from what
is actually deployed.

```mermaid
erDiagram
    cors_origins {
        uuid id PK
        text origin
        bool enabled
        text description "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
    jobs {
        uuid id PK
        uuid user_id
        text public_id
        text requested_url
        text status
        int attempts
        text last_error "nullable"
        uuid profile_id "nullable"
        timestamptz started_at "nullable"
        timestamptz finished_at "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
    profiles_cache {
        uuid id PK
        text public_id
        text profile_url
        jsonb normalised
        jsonb raw "nullable"
        int schema_version
        timestamptz fetched_at
        timestamptz expires_at
        timestamptz created_at
        timestamptz updated_at
    }
    users {
        uuid id PK
        text email
        text password_hash
        timestamptz created_at
        timestamptz updated_at
        text session_token_hash "nullable"
        timestamptz session_expires_at "nullable"
    }
    profiles_cache ||--o{ jobs : "profile_id (nullable)"
    users ||--o{ jobs : "user_id"
```

## Notes

- **`users`** — email is unique case-insensitively (`users_email_lower_key` on
  `lower(email)`). `password_hash` is scrypt: `scrypt$N$r$p$salt$hash`.
- **`sessions`** — `token_hash` is the SHA-256 of the bearer token; the token
  itself is never stored. A session is live while `revoked_at IS NULL AND
  expires_at > now()`. Logout sets `revoked_at`.
- **`profiles_cache`** — shared across users, one row per `public_id`. `raw`
  keeps the untouched upstream payload so a corrected normaliser can re-run
  without refetching; `schema_version` records which normaliser produced
  `normalised`.
- **`jobs`** — one row per submission, and doubles as per-user search history
  (`jobs_user_created_idx` on `user_id, created_at DESC`). Claimed by the worker
  with `FOR UPDATE SKIP LOCKED` via `jobs_claim_idx`. `profile_id` is
  `ON DELETE SET NULL` so evicting a cache row does not delete history.
- Two users searching the same profile each get their own `jobs` row; duplicate
  fetch work is prevented at runtime by a `pg_advisory_xact_lock` on
  `public_id`, not by a unique constraint.

## Regenerating

```bash
cd api && pnpm db:erd
```
