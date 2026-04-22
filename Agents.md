# AGENTS.md

## Project
D&D Companion is a responsive web MVP for campaign memory, session recaps, contextual D&D rules/ability surfacing, and grounded AI Q&A.

## Product priorities
1. Campaign memory
2. Session recap generation
3. Contextual rules and ability surfacing
4. Grounded AI answers
5. Strict DM vs player visibility boundaries

## Non-goals for MVP
- Full character sheet replacement
- Full spell compendium
- Combat automation engine
- VTT/map tooling
- Native mobile apps
- Unbounded autonomous agent behavior

## Architecture preferences
- Use the existing monorepo structure
- Prefer shared types over duplicated types
- Prefer incremental changes over broad rewrites
- Keep AI workflows deterministic and inspectable
- Preserve permission boundaries at all times

## Rules for all tasks
- Never weaken DM/player visibility guarantees
- Never add scope beyond the Linear issue
- Do not make speculative product decisions unless explicitly requested in the issue
- Prefer the smallest change that fully satisfies acceptance criteria
- For UI work, optimize for mobile-first responsive behavior
- For AI work, preserve citations / grounding paths in code and UI
- If a requirement is ambiguous, implement the safest narrow interpretation
- Do not introduce new dependencies unless clearly justified in the PR summary

## Before making changes
1. Read the linked Linear issue
2. Read README.md
3. Read docs/engineering/working-agreement.md
4. Read docs/engineering/definition-of-done.md
5. Read docs/engineering/code_review.md
6. Confirm scope boundaries before editing

## During implementation
- Keep functions small and composable
- Prefer explicit types
- Add or update tests for changed behavior
- Keep PRs narrowly scoped
- Preserve accessibility and empty/error/loading states for UI

## After implementation
- Run lint
- Run typecheck
- Run tests relevant to the change
- Summarize changes clearly
- List any assumptions made
- List follow-up work separately rather than sneaking it into scope

## AI-specific constraints
- Retrieval must be visibility-filtered before answer composition
- Answers must be grounded in campaign data and/or rules snippets
- Do not implement "clever" hidden memory
- Do not fabricate rules content beyond the defined snippets/data source

## Review standard
Follow docs/engineering/code_review.md for self-review before finalizing.