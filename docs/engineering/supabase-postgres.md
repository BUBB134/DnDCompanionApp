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

## Preview and production

Configure the same secret names in Vercel and in the protected GitHub environments used by the manual Integration Smoke workflow:

| Variable | Recommended value |
| --- | --- |
| `DATABASE_URL` | Supabase direct or pooler Postgres URL with `sslmode=require` |
| `DATABASE_POOL_MAX` | `3` for preview, `5` for production until traffic requires tuning |
| `DATABASE_CONNECTION_TIMEOUT_MS` | `10000` |
| `DATABASE_IDLE_TIMEOUT_MS` | `30000` |
| `AUTH_SESSION_SECRET` | Environment-specific secret, minimum 32 characters |

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
