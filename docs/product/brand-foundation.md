# The DnD Companion Brand Foundation

## Canonical identity

- Product name: **The DnD Companion**
- Short name: **DnD Companion**, only where the full name does not fit
- Production origin: **https://thedndcompanion.com**
- Product promise: **Remember the story. Find what matters. Keep playing.**

Internal package names such as `@dnd/*`, repository names, ticket titles, and historical migration identifiers are technical contracts rather than public branding. Do not rename them as part of product-copy work.

## Stitch-derived visual direction

The approved Google Stitch `dnd companion` work is the visual source for this interim identity. The implementation preserves its Arcane System direction:

- a field journal paired with a clean instrument panel
- ink and charcoal foundations with parchment narrative surfaces
- restrained gold for story accents, teal for shared and informational state, and oxblood for DM-private or critical state
- Playfair Display for expressive campaign moments and Inter for navigation, forms, metadata, and table tools
- the checked-in faceted Arcane mark as the interim product icon
- warm, concise table language with ornament kept secondary to readability

Treat Stitch output as design input. Reuse tokens and components, preserve real application behaviour, and supply accessible focus, loading, empty, error, disabled, and save states even when a mockup omits them.

## Wordmark and icon

Use the full wordmark on browser metadata, authentication, invitations, desktop headers, social previews, and primary onboarding. The short name is suitable for mobile install labels and other constrained surfaces.

`apps/web/public/brand-mark.svg` is the canonical interim vector mark. The generated PWA icons and social preview reuse the same faceted geometry and the Arcane palette. A future high-fidelity identity may replace the mark without changing the canonical product name.

## Typography

- Display: Playfair Display for campaign titles, recaps, and narrative moments
- Interface: Inter for controls, navigation, metadata, forms, and dense live-session tools
- Fallbacks: Georgia for display text and the system sans-serif stack for interface text

Body copy stays at a comfortable reading size. Decorative type is never used for validation, permissions, save failures, or other precision-critical messages.

## Tone of voice

Prefer warm, direct table language such as “Join the table”, “Previously on”, “What matters next”, and “Start session”. Keep errors and permissions literal. Do not add fantasy flavour when a user needs a precise recovery action.

## Naming checklist

- Use **The DnD Companion** on a primary surface.
- Use **DnD Companion** only when space is constrained.
- Use **D&D** only when referring to the game, its groups, rules, or sessions—not as the product name.
- Use `https://thedndcompanion.com` as the canonical production origin.
- Keep social, PWA, auth, invite, and application-shell metadata aligned with `apps/web/src/brand.ts`.
