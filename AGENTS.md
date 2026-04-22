# AGENTS.md

## Project Shape
- This repository uses npm workspaces.
- The web app lives in `apps/web`.
- Shared reusable code lives in `packages/*`.
- Package imports use the `@dnd/*` namespace.

## Core Commands
- `npm install` installs workspace dependencies.
- `npm run dev` starts the web app locally.
- `npm run build` builds shared packages and the web app.
- `npm run lint` runs ESLint from the repository root.
- `npm test` validates workspace bootstrap configuration.
- `npm run typecheck` runs TypeScript checks.

## Engineering Guardrails
- Keep each branch tied to one Linear issue.
- Keep PRs narrow and avoid product feature work in foundation tasks.
- Preserve player-safe versus DM-only boundaries in future data and AI paths.
- Put reusable types, env helpers, and UI primitives in packages instead of app-local copies.
- Add or update the closest useful test or validation when changing configuration.

## Environment
- Start from `.env.example`.
- Browser-safe values must use the `NEXT_PUBLIC_` prefix.
- Server-only values must stay out of client components and shared browser code.

