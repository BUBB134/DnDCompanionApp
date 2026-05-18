# Domain Content

Gameplay/reference content should live in the database layer, not in page or
component constants. The MVP seed is intentionally small and covers contextual
conditions plus core mechanics used by rules cards, note linking, suggestions,
and future AI retrieval.

## Source Of Truth

- Baseline rule content is defined in `packages/db/src/domain-content.ts`.
- SQL migrations seed and evolve persisted rows in `rule_snippets`.
- App code may import the baseline seed only for local bootstrap/fallback flows.
- Production, preview, and saved campaigns should read rules through
  `listRuleSnippetsForUser()`.

## Retrieval Contract

Rule retrieval must:

- require campaign membership before returning content
- include global baseline content plus campaign-scoped overrides when present
- prefer campaign-scoped rows over global rows with the same slug
- preserve `dm-only` versus `player-safe` visibility
- filter by category/search in SQL for rules panels and suggestion flows
- keep source metadata (`source`, `source_version`, `content_key`, `tags`) with
  rows so future retrieval and AI grounding can explain where a snippet came from

## Extensibility

`rule_snippets.campaign_id` is nullable. A null value means globally seeded
baseline content; a campaign value means campaign/homebrew content. Unique
indexes allow one global slug and one campaign-specific slug per campaign, which
lets future homebrew override baseline snippets without changing frontend
rendering code.

The current MVP deliberately does not ingest a full rules compendium. Add new
baseline snippets through a migration and the DB package seed together so local
fallbacks, tests, and persisted environments stay aligned.
