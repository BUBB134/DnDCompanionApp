# Agents.md

## Project
D&D Companion is a responsive web MVP for campaign memory, session recaps, contextual D&D rules/ability surfacing, and grounded AI Q&A.

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

## Product Priorities
1. Campaign memory
2. Session recap generation
3. Contextual rules and ability surfacing
4. Grounded AI answers
5. Strict DM vs player visibility boundaries

## Non-goals For MVP
- Full character sheet replacement
- Full spell compendium
- Combat automation engine
- VTT/map tooling
- Native mobile apps
- Unbounded autonomous agent behavior

## Architecture Preferences
- Use the existing monorepo structure
- Prefer shared types over duplicated types
- Prefer incremental changes over broad rewrites
- Keep AI workflows deterministic and inspectable
- Preserve permission boundaries at all times

## Rules For All Tasks
- Never weaken DM/player visibility guarantees
- Never add scope beyond the Linear issue
- Do not make speculative product decisions unless explicitly requested in the issue
- Prefer the smallest change that fully satisfies acceptance criteria
- For UI work, optimize for mobile-first responsive behavior
- For AI work, preserve citations / grounding paths in code and UI
- If a requirement is ambiguous, implement the safest narrow interpretation
- Do not introduce new dependencies unless clearly justified in the PR summary

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

## Before Making Changes
1. Read the linked Linear issue
2. Read README.md
3. Read docs/engineering/working-agreement.md
4. Read docs/engineering/definition_of_done.md
5. Read docs/engineering/code_review.md
6. Confirm scope boundaries before editing

## During Implementation
- Keep functions small and composable
- Prefer explicit types
- Add or update tests for changed behavior
- Keep PRs narrowly scoped
- Preserve accessibility and empty/error/loading states for UI

## After Implementation
- Run lint
- Run typecheck
- Run tests relevant to the change
- Summarize changes clearly
- List any assumptions made
- List follow-up work separately rather than sneaking it into scope

## AI-Specific Constraints
- Retrieval must be visibility-filtered before answer composition
- Answers must be grounded in campaign data and/or rules snippets
- Do not implement hidden memory
- Do not fabricate rules content beyond the defined snippets/data source

## Review Standard
Follow docs/engineering/code_review.md for self-review before finalizing.
