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

## Entity strategy
Use a generic `Entity` model for MVP with a `type` field:
- npc
- location
- faction
- quest
- item

## AI workflows
1. Indexing / ingestion
2. Recap generation
3. Rules / ability retrieval
4. Grounded answer composition

## Critical constraints
- All retrieval must apply visibility filtering before answer composition
- Player-safe and DM-only views must be preserved in both UI and AI pipelines
- Avoid broad schema specialisation until validated by usage