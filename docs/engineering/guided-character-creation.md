# Guided Character Creation

DND-28 adds a focused onboarding route at
`/campaigns/[campaignId]/characters/new`. It creates the same lightweight,
campaign-scoped character companion used by the existing character repository;
it does not introduce a second character model or a full rules sheet.

## Choice catalog

Character creation choices are domain content owned by the database package:

- shared types live in `@dnd/types`
- baseline fallback content lives in
  `@dnd/db/character-creation-content`
- persisted rows live in `character_creation_options`
- the web repository requires campaign membership before returning choices

The initial catalog intentionally contains four classes, four ancestry/species
choices, four backgrounds, and four roleplay directions. Each card can expose:

- a concise player-facing summary and gameplay implication
- actions, traits, proficiencies, quirks, and flavour
- optional ability summaries
- whether the class is ready for future spellbook and spell-slot attachment

This is not a complete rules compendium. Add or revise baseline choices through
the DB seed and a migration so persisted environments and the bundled fallback
remain aligned.

## Persistence

The wizard posts through the existing `createCharacterAction`. Guided
submissions require a name, class, ancestry/species, background, and short
profile. Class ability reminders are converted to the existing
`ability_summaries` child rows.

Campaign membership, ownership, DM/player visibility, and redirect behavior
remain enforced by the existing character repository and action.

## Draft recovery

The browser stores an in-progress draft under
`dnd-character-creation-draft-v1:<user-id>:<campaign-id>`. Scoping by both
identity and campaign prevents accounts sharing one browser profile from
reading each other's private character notes. Storage failure never blocks the
server-backed form. The draft is cleared when the final submission starts;
server validation errors repopulate normalized values in the active wizard.

Class, ancestry/species, background, and optional roleplay choices are submitted
as stable catalog slugs. The server reloads the membership-scoped catalog,
rejects stale or tampered slugs, and derives canonical display names and ability
summaries before calling the character repository.

## Fallback behavior

The route first loads `character_creation_options` after confirming campaign
membership. If the catalog is unavailable or empty, it uses the DB-package
baseline and shows a non-blocking notice. Character creation remains usable
without hiding the fact that persisted content could not be refreshed.

## Future extension

Magic-capable class options mark the profile as spellbook-ready through their
generated spellcasting ability reminder. DND-50 can attach spell selection and
slot state to the existing character without replacing this flow.
