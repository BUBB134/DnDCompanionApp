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
References are stored as offset metadata with a `targetType` of `entity` or
`rule`, a `targetId`, and a display label. The current UI preserves and clears
reference metadata conservatively when a block's text changes; later tickets can
add inline entity/rule creation without changing the persistence shape.

## Validation

`apps/web/src/sessions/note-document.ts` owns parsing, normalization, plain-text
projection, and serialization. `manage-session.ts` validates the normalized
document before persistence:

- note documents must be version `1`
- notes are capped at the existing plain-text limit
- documents are capped at 80 blocks
- each block is capped at 2000 characters
- references must point to valid offsets inside their block text

Invalid or missing JSON falls back to the plain-text `notes` field, which keeps
older sessions readable and prevents malformed client state from breaking save
flows.

## Migration Strategy

Migration `0004_session_note_document.sql` adds `sessions.notes_document` as
JSONB and backfills legacy rows by splitting existing plain-text notes into
paragraph blocks. Rows with empty notes receive an empty versioned document.

New saves write both `notes_document` and the derived `notes` projection in the
same transaction. This keeps future graph retrieval and AI indexing able to use
structured blocks while existing rule matching continues to operate on stable
plain text.
