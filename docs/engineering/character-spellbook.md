# Character Spellbook

DND-50 adds a small, campaign-scoped spellbook and spell-slot state layer for
magic-capable character companions. It is deliberately not a full character
sheet or spell rules engine.

## Access model

- Campaign DMs can open and manage every character spellbook.
- Players can open and manage only spellbooks for characters they own.
- Other players cannot read another character's selected spells or slot state.
- Every catalog read and mutation re-checks campaign membership plus owner/DM
  access on the server.

## Data model

- `spell_definitions` stores concise database-backed spell metadata.
- Global baseline spells use a null `campaign_id`; future campaign content can
  override a global spell with the same slug.
- `character_spells` records whether a stable spell slug is currently `known`
  or `prepared`, so a campaign override can replace definition metadata without
  detaching the character's selection.
- `character_spell_slots` stores total and used slots for levels 1 through 9.

The initial catalog is intentionally limited to a few Cleric and Wizard spells.
Add persisted spell content through migrations rather than component constants.

## Magic-capable characters

A character is spellbook-ready when either:

- its class matches a persisted `character_creation_options` class marked
  `magic_capable`, or
- it has a `Spellcasting` ability summary.

This preserves compatibility with guided creation and manually edited
characters without adding a second character model.

## Slot tracking

Slot totals are configured explicitly instead of inferred from class and level.
That keeps this MVP out of full rules automation while still allowing players to
mark slots used and restored during play. Reducing a configured total clamps the
used count so persisted state remains valid.

## DND-53 contract

The future action hotbar can consume `CharacterSpellbook` from `@dnd/types`:

- `spells` exposes selected spell metadata and known/prepared state.
- `slots` exposes total, used, and remaining resources by spell level.
- `availableSpells` exposes the effective class-filtered catalog.

DND-53 should reuse this contract rather than creating parallel spell state.
