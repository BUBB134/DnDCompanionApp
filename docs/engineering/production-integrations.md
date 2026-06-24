# Production Integrations

DND-18 establishes the MVP vendor and environment contract. It does not provision secrets in the repository; preview and production values must be configured in the deployment platform and GitHub environments.

## Vendor stack

| Concern | MVP vendor/configuration | Notes |
| --- | --- | --- |
| Deployment | Vercel | `vercel.json` pins the root install, build, and dev commands used by the monorepo. Preview deployments should map to `NEXT_PUBLIC_APP_ENV=preview`; production should map to `NEXT_PUBLIC_APP_ENV=production`. The runtime also infers preview/production from Vercel's `VERCEL_ENV` when the public flag is absent. |
| Supabase project | Supabase | Use project `egrmvhfroiumcodkotjv` for the public project URL, anon key, service role key, and Postgres URL. Store anon key as an environment variable and the service role key as a server-only secret. |
| Database | Supabase Postgres | Use project `egrmvhfroiumcodkotjv` with a direct or pooler Postgres URL stored only in environment secrets. `DATABASE_URL` must use `postgres://` or `postgresql://`, target the project, and include `sslmode=require`. See `docs/engineering/supabase-postgres.md`. |
| Migrations | Repository SQL migrations | Run `npm run db:migrate:supabase` against preview before promotion and production during release. The migration runner records applied files in `schema_migrations` and wraps each migration in a transaction. |
| Auth | Clerk | Preview and production require `AUTH_PROVIDER=clerk`. Clerk owns account creation, sign-in, sign-out, recovery, session cookies, and account management. Local development may keep `AUTH_PROVIDER=local`. |
| AI | OpenAI API | Set `AI_GROUNDING_MODE=retrieval` only when `OPENAI_API_KEY` is present. Keep model choice in `OPENAI_MODEL` so rate limits and cost can be adjusted per environment. |
| Storage | None for current MVP | `STORAGE_PROVIDER=none` is expected until uploads are introduced. `vercel-blob` is reserved behind `BLOB_READ_WRITE_TOKEN`. |
| Observability | Console baseline, Sentry-ready | `OBSERVABILITY_PROVIDER=console` is the default. Set `OBSERVABILITY_PROVIDER=sentry` with `SENTRY_DSN` and optional `NEXT_PUBLIC_SENTRY_DSN` when the Sentry project is available. |

## Vercel project configuration

The Vercel project should use Git integration for pull request previews and production deploys from `main`.

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root directory | Repository root |
| Install command | `npm install` |
| Build command | `npm run build` |
| Development command | `npm run dev` |
| Production branch | `main` |

Keep the linked `.vercel/project.json` file local and untracked. Contributors can link locally with `vercel link`, then pull environment values into `.env.local` with `vercel env pull .env.local --environment=preview --yes`.

Enable **Automatically expose System Environment Variables** in the Vercel
project settings. The release gate requires `VERCEL_GIT_COMMIT_SHA`; deployed
preview and production health checks return HTTP 503 with a safe configuration
message when that metadata is unavailable.

## Environment reference

| Variable | Scope | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | Browser/server | All environments | `local`, `preview`, or `production`. Controls strict runtime validation. |
| `APP_BASE_URL` | Server | Preview/production, strict smoke | Canonical app origin. Production must be `https://thedndcompanion.com`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Browser/server | Clerk auth | Clerk publishable key. Production must use a `pk_live_...` key. |
| `CLERK_SECRET_KEY` | Server secret | Clerk auth | Clerk secret key. Production must use an `sk_live_...` key. |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/server | Optional until browser Supabase clients ship | Supabase project API URL. Must be `https://egrmvhfroiumcodkotjv.supabase.co` if configured. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/server | Optional until browser Supabase clients ship | Supabase publishable key (`sb_publishable_...`) or legacy anon JWT for browser-safe future client access. RLS remains the data boundary. |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser | Optional | Browser-safe Sentry DSN when client reporting is enabled. |
| `AUTH_PROVIDER` | Server | All environments | `clerk` is required in preview/production. `local` remains available for deterministic contributor accounts. |
| `AUTH_SESSION_SECRET` | Server secret | Local provider only | Optional secret used to sign local-provider cookies. Clerk does not use it. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret | Optional, strict smoke | Supabase secret key (`sb_secret_...`) or legacy service role JWT for future privileged server-only data paths. Never expose to client components. |
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
3. Set `AUTH_PROVIDER=clerk` and add environment-specific `APP_BASE_URL`, `DATABASE_URL`, `DATABASE_POOL_MAX`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and OpenAI secrets in Vercel. Add Supabase public/service keys only when a feature consumes them.
4. Add the same variable and secret names to GitHub environments named `preview` and `production` for the manual Integration Smoke workflow.
5. In Clerk, configure local, preview, and production application origins. See `docs/engineering/managed-auth.md`.
6. Run `npm run env:check:supabase -- --env=preview` and `npm run env:check -- --env=production --strict` locally or in the deployment shell before first release.
7. Run `npm run db:migrate:supabase` against preview, validate with `npm run db:check:supabase`, then repeat for production during release.
8. After Vercel reports the deployment ready, run `npm run deploy:check -- --url=<deployment-url> --expect-env=preview` or `npm run deploy:check -- --url=<deployment-url> --expect-env=production`.

## CI, deploy, and smoke checks

The normal `ci` job remains secret-free and runs install, lint, typecheck, tests, and build on every PR, merge queue event, and push to `main`. It validates the static vendor integration contract through `npm test`.

Pushes to `main` also run the `deploy_supabase` job after `ci` succeeds. That job is bound to the GitHub `production` environment, reads the project reference from `PRODUCTION_PROJECT_ID`, serializes runs with the `supabase-production` concurrency group, applies checked-in repository migrations with `npm run db:migrate:supabase`, and deploys Supabase Edge Functions only when a `supabase/functions` directory exists.

The `Integration Smoke` workflow is manual because it uses protected GitHub environment secrets. It validates required runtime configuration with:

```bash
npm run env:check -- --strict
npm run env:check:supabase -- --env=preview
npm run db:check:supabase
```

Run this workflow against `preview` after preview secrets are created and against `production` before or immediately after a production promotion.

Vercel runs the root workspace's `npm run env:check` before the web build, so preview and production deployments with missing or invalid database or Clerk auth configuration fail before promotion.

The `Deployment Smoke` workflow validates an already-built Vercel URL through the deployed app's `/api/health` route and the public `/sign-in?next=%2F` route:

```bash
npm run deploy:check -- --url=<deployment-url> --expect-env=preview
```

The workflow runs automatically for successful Production deployment statuses and can also be dispatched manually. Protected Vercel previews remain covered by the build-time environment check; use a deployment-protection bypass only when manually smoke-testing one. The health endpoint returns only environment/check status and the Vercel Git commit SHA; it does not expose secrets. A passing result requires runtime environment validation, database connectivity, and an enabled Clerk or local sign-in surface without the deployment-configuration alert. Release gates can pass `--expect-revision=<full-commit-sha>` to reject a healthy deployment built from the wrong revision.

## Runtime validation

The root app layout reports runtime environment issues to server logs without blocking the public sign-in route. Local development defaults to the local provider. Preview and production require `AUTH_PROVIDER=clerk`, `APP_BASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY` before the managed sign-in surface is enabled. Protected app routes still call `assertValidRuntimeEnv(process.env)` after authentication, so invalid deployed configuration fails before users enter the app shell. `SUPABASE_SERVICE_ROLE_KEY` remains validated when present but is not required by the auth flow.

The deployed `/api/health` route performs the same runtime environment validation, verifies that Vercel Git revision metadata is exposed, and then runs a minimal `select 1` against the configured database. It reports `VERCEL_GIT_COMMIT_SHA` as a non-secret release identifier so protected gates can bind a URL to an exact revision. Missing revision metadata, runtime failures, and database failures are surfaced as HTTP 503 and logged in Vercel runtime logs for debugging without returning raw credentials or connection strings to the caller.

## Follow-up hardening

- Add social providers only if first-campaign feedback shows email/password onboarding is insufficient.
- Add the Sentry SDK and source-map upload once the Sentry project and token are provisioned.
- Introduce object storage only when uploads become part of a product ticket.
- Add provider-specific OpenAI request smoke tests after the first grounded AI endpoint exists.
