# Production Integrations

DND-18 establishes the MVP vendor and environment contract. It does not provision secrets in the repository; preview and production values must be configured in the deployment platform and GitHub environments.

## Vendor stack

| Concern | MVP vendor/configuration | Notes |
| --- | --- | --- |
| Deployment | Vercel | `vercel.json` pins the root install, build, and dev commands used by the monorepo. Preview deployments should map to `NEXT_PUBLIC_APP_ENV=preview`; production should map to `NEXT_PUBLIC_APP_ENV=production`. The runtime also infers preview/production from Vercel's `VERCEL_ENV` when the public flag is absent. |
| Database | Supabase Postgres | Use project `egrmvhfroiumcodkotjv` with a direct or pooler Postgres URL stored only in environment secrets. `DATABASE_URL` must use `postgres://` or `postgresql://` and include `sslmode=require`. See `docs/engineering/supabase-postgres.md`. |
| Migrations | Repository SQL migrations | Run `npm run db:migrate:supabase` against preview before promotion and production during release. The migration runner records applied files in `schema_migrations` and wraps each migration in a transaction. |
| Auth | Local signed session provider | `AUTH_PROVIDER=local` is the only supported MVP provider. Preview and production require `AUTH_SESSION_SECRET` so local auth cookies are HMAC-signed. |
| AI | OpenAI API | Set `AI_GROUNDING_MODE=retrieval` only when `OPENAI_API_KEY` is present. Keep model choice in `OPENAI_MODEL` so rate limits and cost can be adjusted per environment. |
| Storage | None for current MVP | `STORAGE_PROVIDER=none` is expected until uploads are introduced. `vercel-blob` is reserved behind `BLOB_READ_WRITE_TOKEN`. |
| Observability | Console baseline, Sentry-ready | `OBSERVABILITY_PROVIDER=console` is the default. Set `OBSERVABILITY_PROVIDER=sentry` with `SENTRY_DSN` and optional `NEXT_PUBLIC_SENTRY_DSN` when the Sentry project is available. |

## Environment reference

| Variable | Scope | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | Browser/server | All environments | `local`, `preview`, or `production`. Controls strict runtime validation. |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser | Optional | Browser-safe Sentry DSN when client reporting is enabled. |
| `AUTH_PROVIDER` | Server | All environments | Currently `local`. |
| `AUTH_SESSION_SECRET` | Server secret | Preview/production | Secret used to sign auth session cookies. Minimum 32 characters. |
| `DATABASE_URL` | Server secret | Preview/production/local Supabase dev | Supabase Postgres connection string for app data and migrations. Must keep `sslmode=require`. |
| `DATABASE_POOL_MAX` | Server | Optional | Max app connection pool size. Start at `3` for preview and `5` for production. |
| `DATABASE_CONNECTION_TIMEOUT_MS` | Server | Optional | Postgres connection timeout in milliseconds. Defaults to `10000`. |
| `DATABASE_IDLE_TIMEOUT_MS` | Server | Optional | Idle pooled connection timeout in milliseconds. Defaults to `30000`. |
| `AI_GROUNDING_MODE` | Server | All environments | `disabled`, `local`, or `retrieval`. Retrieval requires OpenAI credentials. |
| `OPENAI_API_KEY` | Server secret | Retrieval/strict smoke | OpenAI credential used by future AI retrieval and recap flows. |
| `OPENAI_MODEL` | Server | Optional | Model override for AI workflows and rate-limit/cost tuning. |
| `OBSERVABILITY_PROVIDER` | Server | All environments | `console` or `sentry`. |
| `SENTRY_DSN` | Server secret | Sentry only | Server-side error reporting DSN. |
| `LOG_LEVEL` | Server | All environments | `debug`, `info`, `warn`, or `error`. |
| `STORAGE_PROVIDER` | Server | All environments | `none` or `vercel-blob`. |
| `BLOB_READ_WRITE_TOKEN` | Server secret | Blob storage only | Required only when `STORAGE_PROVIDER=vercel-blob`. |

## Deployment setup

1. Create Vercel preview and production environments for the repository.
2. Configure preview with `NEXT_PUBLIC_APP_ENV=preview` and production with `NEXT_PUBLIC_APP_ENV=production`.
3. Add environment-specific `DATABASE_URL`, `DATABASE_POOL_MAX`, `AUTH_SESSION_SECRET`, and OpenAI secrets in Vercel.
4. Add the same secret names to GitHub environments named `preview` and `production` for the manual Integration Smoke workflow.
5. Run `npm run env:check -- --env=production --strict` locally or in the deployment shell before first release.
6. Run `npm run db:migrate:supabase` against preview, validate with `npm run db:check:supabase`, then repeat for production during release.

## CI and smoke checks

The normal `ci` workflow remains secret-free and runs install, lint, typecheck, tests, and build on every PR. It validates the static vendor integration contract through `npm test`.

The `Integration Smoke` workflow is manual because it uses protected GitHub environment secrets. It validates required runtime configuration with:

```bash
npm run env:check -- --strict
npm run db:check:supabase
```

Run this workflow against `preview` after preview secrets are created and against `production` before or immediately after a production promotion.

## Runtime validation

The web app calls `assertValidRuntimeEnv(process.env)` during server startup. Local development defaults are permissive. Preview and production fail fast when critical configuration is missing or malformed, including unsigned auth sessions, invalid Postgres URLs, retrieval mode without OpenAI credentials, Sentry mode without a DSN, or blob storage without a token.

## Follow-up hardening

- Replace local auth with a managed auth provider once invitation/join flows are scheduled.
- Add the Sentry SDK and source-map upload once the Sentry project and token are provisioned.
- Introduce object storage only when uploads become part of a product ticket.
- Add provider-specific OpenAI request smoke tests after the first grounded AI endpoint exists.
