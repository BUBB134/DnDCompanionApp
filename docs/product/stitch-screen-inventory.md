# Google Stitch screen inventory and review contract

Status: implementation source for DND-63

Last reviewed: 2026-07-19

## Design source of truth

The approved Google Stitch project named `dnd companion` is the visual source for
this inventory. The Arcane System direction is also recorded in
[`brand-foundation.md`](./brand-foundation.md) and the route hierarchy and
interaction rules are recorded in
[`mvp-ux-direction.md`](./mvp-ux-direction.md).

Stitch output is design input, not production code. Existing data access,
permissions, role filtering, save behavior, and responsive states remain
authoritative. A screen is aligned only when its real loading, empty, error,
disabled, focus, and save states also use the shared visual language.

## Approved-screen inventory

| Stitch view or pattern | Live route | Production owner | Alignment | Tracked gap |
| --- | --- | --- | --- | --- |
| Branded account entry | `/sign-in`, `/sign-up` | `AuthPageFrame`, Clerk appearance | Aligned; desktop and narrow captures are checked in under `docs/product/screenshots` | Provider-hosted recovery variants are verified with the same tokens |
| Campaign overview, atmospheric desktop | `/campaigns/[campaignId]` | `CampaignShell` | Foundation aligned in this change: paper campaign header, narrative display type, shared panels, semantic role states | DND-70 owns the final Now / Previously on / What matters next composition |
| Campaign navigation, desktop and compact | protected routes | `ProtectedAppShell`, `AppShellNavigation` | Foundation aligned in this change: instrument-panel shell, campaign context, 44px targets, mobile scroll navigation | DND-68 adds persistent Find; DND-65 adds Quest and Party destinations |
| Focused live-session workspace | `/sessions` | sessions page, `SessionEditor` | Existing behavior preserved; shared Arcane tokens are available | DND-62 owns start/resume/end state and the final landscape workspace |
| Session notes and recap | `/sessions` | `SessionEditor`, `SessionRecapGenerator` | Existing save, recovery, grounding, and error states preserved | Screenshot alignment follows the DND-62 workspace |
| Guided character creation | `/campaigns/[campaignId]/characters/new` | `CharacterCreateForm` | Existing Stitch-derived flow preserved | Content completeness remains DND-56 and ability allocation remains DND-73 |
| Character profile and action bar | `/campaigns/[campaignId]/characters/[characterId]` | `CharacterProfile`, `CharacterActionHotbar` | Existing Arcane action language preserved | DND-53 owns the complete BG3-style action hotbar |
| Character spellbook | `/campaigns/[campaignId]/characters/[characterId]/spellbook` | `CharacterSpellbookManager` | Existing responsive state preserved | No DND-63 domain expansion |
| Find / command palette | future campaign overlay | not implemented | Not started | DND-68 |
| Quest tracker and party overview | future campaign routes | not implemented | Not started | DND-65 |
| Tactical NPC profile | future world route | not implemented | Not started | DND-71 |
| Immersive location detail | future world route | not implemented | Not started | DND-72 |
| Quick-roll dice tray | future live-session utility | not implemented | Not started | DND-61 |
| Synchronized DM/player combat | future live-session mode | not implemented | Not started | DND-64; DND-37 supplies contextual assistance |

## Arcane System contract

The semantic tokens live in `apps/web/src/app/globals.css` and are exposed to
Tailwind as the `arcane-*` color family.

- Ink: controls, high-emphasis text, and selected navigation.
- Canvas and parchment: journal atmosphere and narrative hierarchy.
- Gold: story accents, campaign identity, and caution.
- Teal: shared, informational, focus, and successful context.
- Oxblood: DM-only, critical, and recovery context.
- Display type: campaign titles, recaps, and narrative moments.
- Interface type: navigation, metadata, forms, and live tools.
- Motion: 180ms state confirmation with a reduced-motion override.
- Targets: primary controls remain at least 44px high.

Reusable production primitives live in `@dnd/ui`:

- `Surface` supports panel, paper, shared, and private semantics.
- `StatusPill` carries text plus color for role and state.
- `EmptyState` supplies a consistent next-action frame.
- `SectionHeading` supplies narrative hierarchy without page-local duplication.

## Known deviations

- Existing feature screens still contain legacy literal palette values. They
  visually match the approved palette, but should migrate to semantic tokens
  when those screens are next changed; DND-63 does not justify unrelated
  domain-component churn.
- The current mobile navigation exposes the existing information architecture.
  Find, Party, Quests, and live-session utilities remain owned by their listed
  tickets.
- Stitch mock data is not copied into repositories or database models.
- Generated decoration that reduces contrast, target size, or reading speed is
  intentionally omitted.
- DM-only and player-visible behavior remains enforced by repositories and
  server routes, never by color or layout alone.

## Screenshot review process

Every PR that claims alignment with an approved Stitch screen must include
before/after captures for the affected route and record the fixture role and
viewport in the filename.

Required viewport set:

| Name | Viewport | Purpose |
| --- | --- | --- |
| phone | 390x844 | Primary touch and no-horizontal-scroll check |
| tablet-landscape | 1024x768 | Table-side and live-session layout |
| desktop | 1440x900 | Atmospheric preparation and campaign hierarchy |

Use local authentication fixtures from the README:

1. Start the app with `AUTH_PROVIDER=local`.
2. Capture DM state as `dm@local.test`.
3. Capture player state as `player@local.test` whenever visibility can differ.
4. Capture loading, populated, empty, error, disabled, focus, and save states
   affected by the change.
5. Store durable baseline evidence in `docs/product/screenshots/<ticket>/` and
   attach the relevant before/after pair to the pull request.
6. Compare hierarchy, spacing, typography, semantic color, target size,
   wrapping, overflow, and role labels against the approved Stitch view.
7. Record intentional deviations in the PR instead of silently approximating
   them.

A reviewer should reject a visual change that matches a static mockup but loses
real behavior, keyboard focus, reduced motion, mobile usability, or role safety.

## DND-63 completion boundary

This foundation change establishes the inventory, semantic tokens, reusable
primitives, responsive shell alignment, and review contract. The feature-owned
screens above remain separate tickets so visual work cannot silently introduce
search, combat, quest, party, live-state, or content-model behavior.

