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

## Root Scripts
- `npm run install` explains the install workflow for this npm workspace.
- `npm run dev` starts the web app locally.
- `npm run build` builds shared packages and the web app.
- `npm run lint` runs ESLint.
- `npm test` runs bootstrap/config validation.
- `npm run typecheck` runs TypeScript checks.

## Workspace Layout

```text
apps/
  web/              Next.js app router application
packages/
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

