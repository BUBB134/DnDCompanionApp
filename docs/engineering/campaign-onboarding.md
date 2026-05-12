# Campaign Onboarding

DND-35 introduces a guided DM setup path on `/campaigns`.

## Stored Campaign Setup

Guided setup persists lightweight campaign metadata on `campaigns`:

- `ruleset`
- `tone`
- `starting_location`
- `onboarding_completed_at`

These fields are intentionally small and descriptive. Deeper worldbuilding,
invite-token management, generated wiki content, and AI campaign creation remain
outside this slice.

## Draft Resume

The client form stores an in-progress draft in browser local storage under
`dnd-campaign-onboarding-draft-v1`. The draft is cleared when the final create
request is submitted; server validation errors repopulate the normalized values.

## First Session Seed

If the onboarding includes an opening scene, campaign creation seeds a first
session with:

- a title from the setup form, falling back to `Session zero`
- a plain-text setup note with ruleset, tone, and starting location
- the opening hook as an unresolved hook

This keeps the dashboard and session workflow aligned immediately after create.

## Invite Handoff

The dashboard exposes invite onboarding as the next DM action, but secure
shareable invite-token generation belongs to DND-34.
