# Managed Authentication

DND-20 selects Supabase Auth as the managed authentication provider for preview
and production. The application already uses the same Supabase project for
Postgres and public API configuration, so this adds real account lifecycle
support without introducing a second identity vendor.

## Provider modes

| Environment | `AUTH_PROVIDER` | Behavior |
| --- | --- | --- |
| Local contributor default | `local` | Keeps deterministic `dm@local.test` and `player@local.test` identities for repository development. |
| Local managed-auth testing | `supabase` | Uses Supabase email/password auth against the configured project. |
| Preview | `supabase` | Required by runtime validation. |
| Production | `supabase` | Required by runtime validation. |

Managed auth requires:

- `APP_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`AUTH_SESSION_SECRET` is retained only for the local signed-cookie provider. It
is not used by Supabase Auth.

## Supabase dashboard setup

1. Enable Email authentication in Supabase Auth providers.
2. Keep email confirmation enabled for preview and production.
3. Set the Supabase Site URL to the production `APP_BASE_URL`.
4. Add the exact local, preview, and production callback URLs to the redirect
   allow-list:
   - `http://localhost:3000/auth/callback`
   - `<preview-origin>/auth/callback`
   - `<production-origin>/auth/callback`
5. Configure production SMTP before inviting real users. The default Supabase
   sender is intended only for limited testing.

The application uses the PKCE callback route at `/auth/callback`. Account
confirmation and password recovery both exchange the returned authorization
code for server-managed auth cookies before redirecting to a validated internal
path.

## Account flows

- `/sign-in` supports email/password sign-in and account creation.
- `/forgot-password` sends a non-enumerating recovery response.
- `/update-password` requires the authenticated recovery session.
- Sign-out revokes the Supabase browser session and clears any legacy local
  cookie.
- Protected routes use verified Supabase JWT claims rather than trusting an
  unverified cookie session payload.

## Campaign identity compatibility

Supabase Auth user IDs are UUIDs, matching the existing `users.id`,
`campaign_memberships.user_id`, and campaign ownership columns. Campaign
creation and invite acceptance already upsert the current `AuthUser`, so managed
identities flow into the existing authorization model without a schema change.

## Migration from local auth

The local provider derives deterministic UUIDs from an email address. Supabase
creates a different UUID for the real account, so persisted local test data is
not automatically transferred.

Before retaining any local test campaign in production:

1. Create and verify the real Supabase account.
2. Find the old local `users` row by normalized email.
3. In one database transaction, insert or upsert the Supabase user ID and move
   campaign ownership, memberships, and authored references from the local ID.
4. Verify campaign access with the managed account before deleting the old
   local user row.

For disposable bootstrap data, create a new campaign with the managed account
instead of migrating the local identity.

## Verification

Run the standard repository checks, then test with `AUTH_PROVIDER=supabase`:

1. Create an account and follow the confirmation link.
2. Sign in, sign out, and sign in again.
3. Open a campaign invite before sign-in and confirm the callback returns to the
   invite.
4. Request password recovery and set a new password.
5. Confirm an unauthenticated request to a protected route redirects to
   `/sign-in?next=...`.
