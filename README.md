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
- `npm run dev` starts the web app locally.
- `npm run build` builds shared packages and the web app.
- `npm run lint` runs ESLint.
- `npm test` runs bootstrap/config validation.
- `npm run typecheck` runs TypeScript checks.

## Database Workflow

The baseline Postgres schema lives in `packages/db/src/schema.ts`, and checked-in SQL migrations live in `packages/db/migrations`.

For local development:

1. Copy `.env.example` to `apps/web/.env.local`.
2. Start or point `DATABASE_URL` at a local Postgres instance.
3. Run `npm run db:generate -- <migration-name>` when you need a new migration file.
4. Run `npm run db:migrate` to apply migrations locally.
5. Run `npm run db:check` if you want a quick connectivity/configuration check.

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
- `docs/engineering/working-agreement.md`
- `docs/engineering/code_review.md`
- `docs/engineering/definition_of_done.md`

