# Character Creation Catalog

DND-56 expands the database-backed character creation catalog used by the
Google Stitch-derived guided character creation flow. It changes content, not
the approved Arcane System layout or interaction model.

## Supported rules baseline

The supported baseline is **D&D fifth edition SRD 5.1**:

- all 12 SRD classes
- all 9 SRD races/ancestries
- the four concise core backgrounds already supported by the product
- four system-neutral roleplay directions

Every class exposes ability reminders for the character companion and action
hotbar. Magic-capable classes also expose a Spellcasting reminder so the
spellbook can attach without UI-specific class checks.

## Licensing boundary

The catalog uses names and mechanics available in *System Reference Document
5.1*, Copyright 2016 Wizards of the Coast LLC, released under the Creative
Commons Attribution 4.0 International License. Player-facing summaries in this
repository are original concise descriptions. The existing additional
background names use original descriptions and do not reproduce sourcebook
rules text.

Do not add setting-specific, third-party, or non-SRD rules text to the baseline.

## Seed and migration

The bundled fallback is in
`packages/db/src/character-creation-content.ts`. Persisted environments are
updated by `0014_complete_character_creation_catalog.sql`, which upserts by
stable slug and is safe to rerun. Both sources must stay aligned.

Validation should reject duplicate slugs, missing categories, empty metadata,
and references to options not present in the membership-scoped catalog.
