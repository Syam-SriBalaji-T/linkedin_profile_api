# Unfurl — LinkedIn Profile API

A hosted API that accepts a LinkedIn profile URL and returns the profile as
structured JSON, by **reverse-engineering LinkedIn's mobile web endpoint** —
direct HTTP, no browser automation, no third-party scraping API.

## Live

| | |
| --- | --- |
| **Web UI** | <https://unfurl.syamdev.site/> |
| **API base** | <https://api.unfurl.syamdev.site/> |
| **Health check** | <https://api.unfurl.syamdev.site/health> |

```bash
curl "https://api.unfurl.syamdev.site/profile?url=https://www.linkedin.com/in/sundarpichai/"
```

## The challenge

Built for the **Tross engineering hiring challenge**:

> Reverse engineer LinkedIn APIs and build a hosted API that accepts a LinkedIn
> profile URL and returns most of the information available on the profile page
> as structured JSON.

| Requirement | Where it is met |
| --- | --- |
| Deploy the API publicly over HTTPS | `api.unfurl.syamdev.site` — Let's Encrypt certificate, HTTP redirects to HTTPS |
| Accept a LinkedIn profile URL as input | `GET /profile?url=…` — accepts a full profile URL or a bare vanity slug |
| Return name, headline, location, about, experience, education, skills, certifications, languages and profile images | See the response schema under **API** below |
| May use own LinkedIn credentials in the backend | A single authenticated session cookie, supplied via `LINKEDIN_COOKIE` |
| Public GitHub repository with complete source | This repository |
| README with setup, API documentation, approach and known limitations | This file |
| Keep all credentials and secrets out of the repository | `.env` files and captured cookie dumps are gitignored; no secret has ever been committed |

The response schema was left to the implementer; the one used here is documented
below.

## Approach

LinkedIn has no public API for arbitrary profiles, and its desktop web app
renders everything client-side via an internal GraphQL API (`/voyager/api/...`)
whose `queryId` is tied to the current web build and rotates constantly. The old
REST endpoint (`/identity/profiles/{id}/profileView`) is now **410 Gone**.

The stable path is LinkedIn's **mobile server-rendered HTML**. When the profile
page is requested with a **mobile `User-Agent`**, LinkedIn returns the full
profile (name, headline, location, about, experience, education, images) already
rendered in the HTML — no JavaScript, no GraphQL `queryId`, no browser. We fetch
that page over plain HTTP with an authenticated cookie and parse it.

**Pipeline:** `profile URL → extract public id → GET mobile HTML (auth cookie) →
parse with cheerio → normalise → cache (Postgres) → JSON`.

Why this over the alternatives:
- **vs. Voyager GraphQL:** no rotating `queryId` to chase; the HTML shape is far
  more stable.
- **vs. headless browser:** the challenge forbids it, and it's unnecessary — the
  data is in the server-rendered HTML.
- **vs. third-party API (Proxycurl etc.):** forbidden by the challenge; this is
  a genuinely reverse-engineered solution.

## API

### `GET /profile?url=<linkedin profile url>`

Public, synchronous. Returns structured JSON. Serves a cached copy (24h) when
available so repeat calls don't hit LinkedIn.

```bash
curl "https://api.unfurl.syamdev.site/profile?url=https://www.linkedin.com/in/sundarpichai/"
```

Query params:
- `url` (required) — a LinkedIn profile URL, or a bare vanity slug.
- `refresh=true` (optional) — bypass the cache and refetch.

Response:

```json
{
  "cached": false,
  "fetched_at": "2026-08-30T10:00:00.000Z",
  "profile": {
    "public_id": "sundarpichai",
    "profile_url": "https://www.linkedin.com/in/sundarpichai",
    "name": "Sundar Pichai",
    "headline": "CEO at Google",
    "location": "Mountain View, California, United States",
    "about": "CEO of Google and Alphabet. ...",
    "followers": "5,089,287 followers",
    "picture_url": "https://media.licdn.com/...",
    "background_url": "https://media.licdn.com/...",
    "experience": [
      {
        "company": "Google",
        "company_url": "https://www.linkedin.com/company/google",
        "logo_url": "https://media.licdn.com/...",
        "roles": [
          { "title": "CEO", "date_range": "2015 - Present", "duration": "11 yrs 8 mos" },
          { "title": "Product Management + Leadership", "date_range": "Apr 2004 - 2015", "duration": "10 yrs 9 mos" }
        ]
      }
    ],
    "education": [
      { "school": "The Wharton School", "degree": "MBA", "school_url": "https://www.linkedin.com/school/the-wharton-school/", "logo_url": "..." }
    ],
    "skills": [],
    "certifications": [],
    "languages": [],
    "schema_version": 2
  }
}
```

Errors return `{ "statusCode", "error", "message", "path" }`:
`400` invalid URL · `404` profile not found · `429` rate-limited by LinkedIn ·
`503` LinkedIn session invalid/not configured · `502/504` upstream/timeout.

### Other endpoints

- `GET /health` — `{ ok, session_valid, database }`.
- Optional accounts layer (`/auth/*`, `/searches`) provides per-user search
  history backed by an async worker; not required by the challenge, kept as a
  bonus. The graded surface is `GET /profile`.

## Setup

Prerequisites: Node ≥ 22.13, pnpm 11, PostgreSQL (Neon works well).

```bash
cd api
pnpm install
cp .env.example .env      # fill in the values below
pnpm migrate              # create tables
pnpm start:dev            # http://localhost:3001
```

### Configuration (`api/.env`)

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | Postgres connection string |
| `DIRECT_DATABASE_URL` | non-pooled URL, Prisma CLI only (optional) |
| `LINKEDIN_COOKIE` | **the full `Cookie` header** from a logged-in linkedin.com request (see below) |
| `PROFILE_CACHE_TTL_HOURS` | cache freshness (default 24) |
| `LINKEDIN_MIN_REQUEST_INTERVAL_MS` | min gap between LinkedIn calls (default 4000) |

**Getting `LINKEDIN_COOKIE`:** log into LinkedIn in Chrome → DevTools → Network →
click any `www.linkedin.com` request → Request Headers → copy the entire
`Cookie:` value. It must include `li_at`, `JSESSIONID`, and `lidc`. This is a
full login credential — keep it out of the repo (it lives only in `.env`, which
is gitignored).

## Tech stack

NestJS + TypeScript · PostgreSQL (raw SQL migrations) · cheerio (HTML parsing) ·
pnpm. `prisma/schema.prisma` is a read-only schema view (not used at runtime).

## Deployment

Running on a single **AWS EC2 `t4g.small`** (2 vCPU ARM/Graviton, Ubuntu 24.04)
in `ap-southeast-1`, deliberately co-located with the **Neon** Postgres instance
so database round-trips stay on the same continent as the app.

Everything runs as containers under Docker Compose:

| Service | Role |
| --- | --- |
| `caddy` | Reverse proxy; terminates TLS and obtains/renews Let's Encrypt certificates automatically. The only container with published ports (80/443). |
| `web` | Next.js UI on `unfurl.syamdev.site` |
| `api` | NestJS HTTP API on `api.unfurl.syamdev.site` |
| `worker` | Polls the job queue for the async search-history feature |
| `migrate` | Run-once SQL migrations |

`api` and `web` publish no host ports — they are reachable only over the internal
Docker network, so every external request goes through Caddy. Hostname routing
lives in `Caddyfile`.

```bash
# deploy a change
git pull && docker compose up -d --build

# operate
docker compose ps
docker compose logs -f api
docker compose restart worker
```

## Known limitations

- **Rate limiting.** A single account gets soft-blocked by LinkedIn after a
  burst of automated requests (HTTP 302 to the same URL). Mitigated with request
  pacing (`LINKEDIN_MIN_REQUEST_INTERVAL_MS`) and a 24h cache, but sustained
  high volume needs proxy rotation and multiple accounts — out of scope here.
- **Cookie expiry.** `LINKEDIN_COOKIE` must be refreshed when it expires
  (notably the `lidc` routing cookie, ~24h TTL) or after logout/password change.
  `/health` reports `session_valid` so this is observable.
- **Field availability.** Skills, certifications, and languages are only present
  when the profile exposes them in the mobile view; they return empty otherwise.
- **Markup drift.** Parsing depends on LinkedIn's mobile HTML structure; a
  redesign would require updating the selectors in `api/src/normalise/html-parser.ts`.
- **Terms of service.** Automated collection is against LinkedIn's ToS; this is a
  technical challenge solution, not for production use.

## Project structure

```
api/
  src/
    linkedin/     html-profile.fetcher.ts (mobile SSR fetch), url parsing, errors
    normalise/    html-parser.ts (cheerio → structured profile), types
    profiles/     public-profile.controller.ts (GET /profile), cache repository
    auth/ searches/ jobs/  bonus: accounts + async search history
    database/ config/ common/ health/
  migrations/     raw SQL
web/              Next.js UI (optional demo)
Caddyfile         reverse proxy + automatic HTTPS for both hostnames
docker-compose.yml  api / worker / web / caddy / migrate
```
