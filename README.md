# CoReeder

Understanding, built into the web. Highlight anything you're reading and CoReeder explains it using only what you've already read. Save articles to a library that remembers where you stopped.

```
apps/extension   Browser extension (WXT + TypeScript)
apps/api         API: explanations, library, progress, sharing (Express + Postgres)
apps/web         Website: landing page (/), library (/app), shared libraries (/shared/:token)
packages/shared  Types and URL helpers used by all three
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together.

## Prerequisites

- Node.js 22+
- A Postgres database (local Docker is fine)
- An OpenAI API key
- A Supabase project for Google sign-in (free tier works)

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/extension/.env.example apps/extension/.env
```

Fill in the three `.env` files, then:

```bash
npm run dev:api        # http://localhost:3000 (runs migrations on start)
npm run dev:web        # http://localhost:5173
npm run dev:extension  # opens Chrome with the extension loaded and hot reload
```

A local database:

```bash
docker run -d --name coreeder-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=coreeder -p 5432:5432 postgres:17
```

Use `DATABASE_URL=postgres://postgres:postgres@localhost:5432/coreeder` and `DATABASE_SSL=false`.

### Supabase sign-in

1. **Authentication → Providers → Google**: enable it with a Google OAuth client.
2. **Authentication → URL Configuration → Redirect URLs**, add:
   - `https://*.chromiumapp.org/**` (the extension's sign-in redirect)
   - `http://localhost:5173/app` and your production `https://<web-domain>/app`
3. **Project Settings → API**: copy the project URL and anon key into the extension and web `.env` files, and the project URL into `apps/api/.env` as `SUPABASE_URL`. The API verifies tokens with the project's JWKS. Older projects that still sign with the legacy HS256 secret should also set `SUPABASE_JWT_SECRET`.

## Scripts

Run from the repo root:

| Command | What it does |
| --- | --- |
| `npm test` | All unit and integration tests (the API tests use an in-memory Postgres) |
| `npm run typecheck` | TypeScript and svelte-check across the workspace |
| `npm run build` | Production builds of every app |
| `npm run zip -w @coreeder/extension` | Packages the extension for the Chrome Web Store |

CI runs typecheck, tests and builds on every push and pull request, and uploads the packaged extension as an artifact.

## Deploying

Deploy each app from the **repository root** so npm workspaces resolve:

| App | Build command | Start command |
| --- | --- | --- |
| API | `npm ci && npm run build -w @coreeder/api` | `npm run start -w @coreeder/api` |
| Web | `npm ci && npm run build -w @coreeder/web` | `npm run start -w @coreeder/web` |

The API applies pending database migrations on startup. The first deploy renames the old email-based tables to `legacy_*` and creates the new schema (see `apps/api/migrations/`).

Environment variables are listed in each app's `.env.example`. The web app reads its `PUBLIC_*` variables at runtime, so changing them doesn't need a rebuild. The extension's `WXT_*` variables are baked in at build time.
