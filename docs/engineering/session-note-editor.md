# Session Note Editor Foundation

## Decision

Session notes use a versioned JSON document stored in `sessions.notes_document`
alongside the existing plain-text `sessions.notes` fallback.

The app stores both forms intentionally:

- `notes_document` is the source for editor structure, block types, and future
  inline references.
- `notes` remains the plain-text projection used for previews, rule matching,
  search indexing, and compatibility with older rows.

The MVP document shape is:

```json
{
  "version": 1,
  "blocks": [
    {
      "id": "block-id",
      "type": "paragraph",
      "text": "Session note text",
      "references": []
    }
  ]
}
```

Supported block types are `paragraph`, `heading`, `quote`, and `callout`.
References are stored as offset metadata with a `targetType` of `entity`,
`rule`, or `character`, a `targetId`, and a display label. Character references
use the same metadata shape once campaign characters are available to the
editor.

Wiki-style references are written directly in block text with double brackets.
When notes are saved, the session workflow resolves visible campaign entities,
rules, and characters into block reference metadata. Existing wiki entities can
be matched by name, and new campaign wiki entities can be created during the
session save by using an entity type prefix such as `[[npc: Captain Thorn]]`,
`[[location: Sunken Lighthouse]]`, `[[quest: Missing Lantern]]`,
`[[faction: Red Sashes]]`, or `[[item: Tide Key]]`.

While editing, typing an open wiki reference such as `[[cap`,
`[[rule: pro`, or `[[npc: Captain Thorn` surfaces inline suggestions for
visible campaign entities, rule snippets, characters, and typed entity creation.
Selecting a suggestion only writes wiki syntax back into the block text; save
validation remains the source of truth for reference metadata, visibility
filtering, and inline entity creation.

## Validation

`apps/web/src/sessions/note-document.ts` owns parsing, normalization, plain-text
projection, and serialization. `manage-session.ts` validates the normalized
document before persistence:

- note documents must be version `1`
- notes are capped at the existing plain-text limit
- documents are capped at 80 blocks
- each block is capped at 2000 characters
- references must point to valid offsets inside their block text
- wiki references are resolved only against visibility-filtered campaign data

Invalid or missing JSON falls back to the plain-text `notes` field, which keeps
older sessions readable and prevents malformed client state from breaking save
flows.

## Migration Strategy

Migration `0004_session_note_document.sql` adds `sessions.notes_document` as
JSONB and backfills legacy rows by splitting existing plain-text notes into
paragraph blocks. Rows with empty notes receive an empty versioned document.

New saves write both `notes_document` and the derived `notes` projection in the
same transaction. The plain-text projection strips wiki brackets to keep search,
preview, and rule matching readable, while `notes_document` keeps link metadata
for graph retrieval and AI grounding.
