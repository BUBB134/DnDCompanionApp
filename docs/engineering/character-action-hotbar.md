# Character Action Hotbar

DND-53 adds a compact, mobile-first action surface to full character profiles.
It combines the existing character companion, guided creation, rules, and
spellbook contracts instead of creating a parallel combat or character-sheet
model.

## Source data

- Character ability summaries supply class features and their trigger text.
- Matching class, ancestry/species, and background options supply contextual
  actions, traits, and quirks from `character_creation_options`.
- Common actions are stored as `rule_snippets` tagged `common-action`.
- Selected spells and slot pools come from the DND-50 `CharacterSpellbook`
  contract.

The route loads all sources only after the existing campaign and character
access checks succeed. Player-safe character summaries do not receive private
hotbar data.

## Availability model

- Cantrips remain available without a slot pool.
- Prepared levelled spells are available only while a matching slot remains.
- Known but unprepared spells remain visible but clearly unavailable.
- Character abilities and contextual creation actions are reminders, not
  automated rules enforcement.

Slot use and restore controls reuse the DND-50 server action. Every mutation
re-checks campaign membership and character ownership or DM access before
changing state.

## Interaction model

The client component owns only transient presentation state:

- active action-group filter
- selected detail card
- pending and result states for slot mutations

The server remains responsible for loading permission-filtered content and
building the initial hotbar model. The action grid uses real buttons,
`aria-pressed` filter/selection state, readable availability labels, and
touch-sized controls.

## Scope boundary

This hotbar is an at-table reference and resource surface. It does not resolve
attacks, enforce spell targeting, track turns, automate rests, or attempt a
complete D&D character sheet.
