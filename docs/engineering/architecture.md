# Architecture

## MVP technical shape
- Responsive web app / PWA
- Monorepo
- Frontend: Next.js + TypeScript + Tailwind
- Backend: Next.js server actions / route handlers
- Database: Postgres
- Vector search: pgvector or equivalent
- Background jobs for ingestion, summarisation, and embeddings

## Core domains
- User
- Campaign
- CampaignMembership
- CampaignInvite
- Session
- Character
- Entity
- Note
- RuleSnippet
- AbilitySummary
- AIConversation
- AIMessage
- InitiativeEntry
- ConditionState
- LootItem

## Session note editor
Session notes use a versioned block document stored alongside a plain-text
projection so editing can evolve toward inline references and graph retrieval
without breaking current previews, rules matching, or search. See
`docs/engineering/session-note-editor.md`.

## Domain content
Rules, conditions, mechanics, and future gameplay reference content are persisted
as database-backed domain content instead of page/component constants. Baseline
seed content lives in the DB package and is loaded through permission-aware
repositories, with nullable campaign ownership reserved for future
campaign-specific overrides. See `docs/engineering/domain-content.md`.

## Campaign memory retrieval
Grounded AI and recap flows should retrieve campaign memory through the
deterministic corpus in `apps/web/src/memory`. It combines session notes,
recaps, unresolved hooks, entities, rules, and characters after membership and
visibility filtering, and each result carries a source path for citations. See
`docs/engineering/campaign-memory-retrieval.md`.

## Entity strategy
Use a generic `Entity` model for MVP with a `type` field:
- npc
- location
- faction
- quest
- item

Entity backlinks are derived from session tags and note reference metadata so
users can move from wiki entities back into the sessions where they were
mentioned. See `docs/engineering/entity-backlinks.md`.

## AI workflows
1. Indexing / ingestion
2. Recap generation
3. Rules / ability retrieval
4. Grounded answer composition

## Critical constraints
- All retrieval must apply visibility filtering before answer composition
- Player-safe and DM-only views must be preserved in both UI and AI pipelines
- Avoid broad schema specialisation until validated by usage
