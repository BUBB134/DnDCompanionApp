# Entity Backlinks

Entity backlinks are derived from existing session note metadata rather than a
new graph table.

## Source Data

- `session_entity_tags` records every entity linked to a session, including
  explicit tags and resolved wiki-style entity references.
- `sessions.notes_document` stores the exact inbound reference metadata for
  entity wiki links, including the block id, label, and target id.

The entity repository combines these sources into `CampaignEntityBacklinks`:

- `linkedSessions` gives the navigable session history for an entity.
- `mentionReferences` gives the exact inbound note references and readable
  excerpts for the entity page and future retrieval/indexing.

## Permission Contract

Backlinks are loaded through membership-aware repository queries. Players only
receive backlinks for player-safe entities; DMs can see backlinks for both
player-safe and DM-only entities. The repository applies the same visibility
rules used by entity listing before any backlink rows are returned. Sessions are
scoped to the selected campaign before any backlink rows are returned.

## AI Retrieval Contract

Campaign memory retrieval loads entities with backlinks. Entity memory documents
include linked session titles, mention labels, reference excerpts, and backlink
counts in their deterministic corpus data. Future vector indexing should treat
these fields as graph context for the entity document, not as hidden memory.
