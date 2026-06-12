# Supabase Postgres Integration

DND-33 connects the app and migration tooling to the hosted Supabase Postgres project without committing credentials.

## Project target

| Setting | Value |
| --- | --- |
| Project ref | `egrmvhfroiumcodkotjv` |
| Direct host | `db.egrmvhfroiumcodkotjv.supabase.co` |
| Port | `5432` |
| Database | `postgres` |
| User | `postgres` |
| Project URL | `https://egrmvhfroiumcodkotjv.supabase.co` |

Use this connection string shape for local development, preview, and production secrets:

```txt
postgresql://postgres:<url-encoded-password>@db.egrmvhfroiumcodkotjv.supabase.co:5432/postgres?sslmode=require
```

If the database password contains symbols such as `@`, `:`, `/`, `?`, or `#`, URL-encode it before placing it in `DATABASE_URL`.

## Local setup

1. Copy `.env.example` to `apps/web/.env.local`.
2. Replace `REPLACE_WITH_SUPABASE_DATABASE_PASSWORD` in `DATABASE_URL`.
3. Keep `sslmode=require` in the URL.
4. Run `npm run db:check:supabase` to validate the hosted connection.
5. Run `npm run db:migrate:supabase` to apply repository migrations to Supabase.
6. Run `npm run db:check:supabase` again as a quick post-migration smoke test.

Do not commit `apps/web/.env.local`, database passwords, pooled URLs, or Supabase service keys.

## Environment contract

Preview and production must carry the same Supabase project identity in Vercel and in the matching GitHub environments used by smoke workflows.

| Variable | Local | Preview | Production | Notes |
| --- | --- | --- | --- | --- |
| `APP_BASE_URL` | `http://localhost:3000` | Preview origin | Production origin | Use the same origins in Supabase Auth URL allow-lists. Keep this as an origin only, without a path. |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional but recommended | Required | Required | Must be `https://egrmvhfroiumcodkotjv.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional until browser Supabase clients ship | Required | Required | Supabase publishable key (`sb_publishable_...`) or legacy public anon JWT. RLS controls access; do not use it for privileged server work. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional for local admin scripts | Required | Required | Supabase secret key (`sb_secret_...`) or legacy service role JWT. Never expose to client components, docs, logs, or screenshots. |
| `DATABASE_URL` | Required for Supabase-backed local dev | Required | Required | Direct or pooler Postgres URL targeting project `egrmvhfroiumcodkotjv` with `sslmode=require`. |

Auth callback routes are not implemented yet because the MVP auth provider is still local signed sessions. When Supabase Auth is added, keep callback URLs under each environment's `APP_BASE_URL` origin and add them to Supabase's redirect allow-list before enabling the provider.

## Preview and production

Configure the same secret names in Vercel and in the protected GitHub environments used by the manual Integration Smoke workflow:

| Variable | Recommended value |
| --- | --- |
| `APP_BASE_URL` | Preview or production app origin |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://egrmvhfroiumcodkotjv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Environment-specific Supabase publishable key or anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Environment-specific Supabase secret key or service role JWT |
| `DATABASE_URL` | Supabase direct or pooler Postgres URL with `sslmode=require` |
| `DATABASE_POOL_MAX` | `3` for preview, `5` for production until traffic requires tuning |
| `DATABASE_CONNECTION_TIMEOUT_MS` | `10000` |
| `DATABASE_IDLE_TIMEOUT_MS` | `30000` |
| `AUTH_PROVIDER` | `supabase` in preview/production; `local` remains available for contributor bootstrap accounts |
| `AUTH_SESSION_SECRET` | Optional local-provider cookie secret; not used by Supabase Auth |

Use separate preview and production databases, branches, or Supabase projects when destructive preview testing becomes necessary. Never point throwaway preview testing at production data.

## Pooling guidance

The app uses a shared `pg.Pool` in `@dnd/db`. Supabase connections should remain conservative because serverless and preview environments can create many short-lived processes:

- Start with `DATABASE_POOL_MAX=5` for production and lower values for preview.
- Prefer a Supabase pooler URL if the deployment environment cannot reliably reach the direct IPv6 database host.
- Keep `sslmode=require` on both direct and pooler URLs.
- Run migrations with `npm run db:migrate:supabase` from a controlled environment before promoting a release.

## Validation flow

Use these commands before requesting review or promoting an environment:

```bash
npm run env:check -- --env=preview
npm run env:check:supabase -- --env=preview
npm run db:check:supabase
npm run db:migrate:supabase
npm run db:check:supabase
npm run deploy:check -- --url=<preview-deployment-url> --expect-env=preview
```

The `db:*:supabase` scripts verify that `DATABASE_URL` targets project `egrmvhfroiumcodkotjv`, requires SSL, redacts the secret when printing the target, and then performs the same live database operation as the generic scripts.

## Optional agent setup

Supabase agent skills are optional for contributors who want provider-specific operational help:

```bash
npx skills add supabase/agent-skills
```

Installing that helper is not required for application runtime, CI, migrations, or local development.
