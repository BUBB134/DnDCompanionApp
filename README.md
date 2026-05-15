# D&D Companion

Responsive web MVP for campaign memory, session recaps, contextual rules/ability surfacing, and grounded AI Q&A for D&D groups.

## MVP Pillars
- Campaign memory
- Session logging and recaps
- Character companion (lightweight)
- Campaign wiki entities
- Contextual rules and ability surfacing
- Grounded AI Q&A
- Table utilities

## Principles
- Support the table, do not dominate it
- Context first
- Surface, do not overwhelm
- AI must be grounded
- Fast at the table
- Clear player vs DM boundaries

## Monorepo Quick Start

```bash
npm install
npm run dev
```

The web app runs from `apps/web` and is exposed through the root `dev` script.

## Local Membership Bootstrap

The protected app currently resolves campaign access from a small local bootstrap dataset while the broader campaign data layer is still being built.

- Sign in as `dm@local.test` to exercise DM access.
- Sign in as `player@local.test` to exercise player-safe access.
- Sign in as any other email to verify the non-member access state.

If you want to try a different user during local development, update the bootstrap membership records in `apps/web/src/campaigns/bootstrap.ts`.

## Root Scripts
- `npm run install` explains the install workflow for this npm workspace.
- `npm run db:generate -- <name>` scaffolds a new SQL migration file.
- `npm run db:migrate` applies local Postgres migrations.
- `npm run db:check` verifies that `DATABASE_URL` is configured and reachable.
- `npm run db:migrate:supabase` applies migrations after verifying the configured Supabase project and SSL mode.
- `npm run db:check:supabase` verifies the configured Supabase project and runs a live connection check.
- `npm run env:check -- --env=production --strict` validates production integration environment wiring.
- `npm run env:check:supabase -- --env=preview` validates strict Supabase provider variables for an environment.
- `npm run dev` starts the web app locally.
- `npm run build` builds shared packages and the web app.
- `npm run lint` runs ESLint.
- `npm test` runs bootstrap/config validation.
- `npm run typecheck` runs TypeScript checks.

## Pull Request Flow

- Create one branch per Linear issue using `dnd-<ticket-number>-short-description`.
- Prefix commit subjects and pull request titles with `[DND-123]`.
- Complete the repository PR template in `.github/pull_request_template.md` and link the Linear issue you are closing.
- Before requesting review, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- Before merge to `main`, expect passing `ci`, `branch-name`, `commit-message`, and `pr-title` checks plus one CODEOWNER approval. See `docs/engineering/branch_protection.md` for the exact GitHub settings that must be applied in the repository UI.

## Database Workflow

The baseline Postgres schema lives in `packages/db/src/schema.ts`, and checked-in SQL migrations live in `packages/db/migrations`. The hosted Supabase setup is documented in `docs/engineering/supabase-postgres.md`.

For Supabase-backed local development:

1. Copy `.env.example` to `apps/web/.env.local`.
2. Replace the placeholder password in `DATABASE_URL` with the Supabase database password.
3. Keep `sslmode=require` in the URL and URL-encode special password characters.
4. Run `npm run db:check:supabase` to validate the hosted connection.
5. Run `npm run db:migrate:supabase` when migrations need to be applied to Supabase.

For isolated local-only database work:

1. Point `DATABASE_URL` at a local Postgres instance.
2. Run `npm run db:check` to validate connectivity.
3. Run `npm run db:generate -- <migration-name>` when you need a new migration file.
4. Run `npm run db:migrate` to apply migrations locally.

## Production Integrations

The MVP production contract is documented in `docs/engineering/production-integrations.md`.

- Deploy the monorepo through Vercel using `vercel.json`.
- Configure preview with `NEXT_PUBLIC_APP_ENV=preview` and production with `NEXT_PUBLIC_APP_ENV=production`.
- Set `DATABASE_URL`, `DATABASE_POOL_MAX`, `AUTH_SESSION_SECRET`, and AI/observability secrets in Vercel and matching GitHub environments.
- Set `APP_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in preview and production.
- Use `npm run env:check -- --env=production --strict` and `npm run db:check:supabase` to validate environment wiring before promotion.

## Workspace Layout

```text
apps/
  web/              Next.js app router application
packages/
  db/               Postgres schema, env helpers, and migrations
  env/              Shared environment variable helpers
  types/            Shared domain types
  ui/               Shared UI primitives
```

## Key Docs
- `Agents.md`
- `docs/product/PRD.md`
- `docs/engineering/architecture.md`
- `docs/engineering/branch_protection.md`
- `docs/engineering/campaign-invites.md`
- `docs/engineering/campaign-onboarding.md`
- `docs/engineering/production-integrations.md`
- `docs/engineering/supabase-postgres.md`
- `docs/engineering/working-agreement.md`
- `docs/engineering/code_review.md`
- `docs/engineering/definition_of_done.md`

