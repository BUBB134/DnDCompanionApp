# Campaign Invites

DND-34 adds secure shareable invite links for player onboarding.

## Data Model

Invite tokens are shown to the DM once, then stored as SHA-256 token hashes in
`campaign_invites`. The raw token is never persisted. Generating a new invite
revokes the current active invite for that campaign so a DM can rotate access
without managing a list of links.

`campaign_invite_acceptances` records which signed-in users accepted a link.
Campaign membership remains the source of truth for access, and the
`campaign_memberships` unique constraint prevents duplicate joins.

## Permissions

Only users with a `dm` membership for the campaign can generate or revoke invite
links. Accepting an invite always creates a `player` membership unless the user
already has a campaign membership, in which case their existing role is preserved.

## Expiry And Revocation

Invite links expire after seven days. The join route treats invalid, expired, and
revoked tokens as separate states so users get a clear recovery path without
leaking private campaign data.

## Auth Flow

`/invite/[token]` is public enough to explain the invite and route unauthenticated
users into sign-in. After sign-in, the safe return path sends the user back to
the same invite URL to accept the link.

## Audit Notes

The MVP audit trail records invite creation, revocation, and per-user acceptance.
Future production hardening can add actor-visible admin history or per-link
usage limits without changing the membership boundary.
