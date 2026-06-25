# Managed Authentication

DND-59 adopts Clerk as the managed authentication provider for preview and
production. The app still stores campaign data in Supabase Postgres, but Clerk
now owns account creation, sign-in, sign-out, recovery, session cookies, and
account management UI.

## Provider modes

| Environment | `AUTH_PROVIDER` | Behavior |
| --- | --- | --- |
| Local contributor default | `local` | Keeps deterministic `dm@local.test` and `player@local.test` identities for repository development. |
| Local managed-auth testing | `clerk` | Uses Clerk with local `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `APP_BASE_URL`. |
| Preview | `clerk` | Required by runtime validation. |
| Production | `clerk` | Required by runtime validation, with `APP_BASE_URL=https://thedndcompanion.com` and Clerk production keys. |

Managed auth requires:

- `AUTH_PROVIDER=clerk`
- `APP_BASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

`AUTH_SESSION_SECRET` is retained only for the local signed-cookie provider. It
is not used by Clerk.

Vercel preview builds run the non-strict environment check. If Clerk preview
keys have not been provisioned yet, the build can still complete, but non-local
runtime defaults to the Clerk provider and renders the explicit configuration
error state instead of exposing local contributor sign-in. Production and
`--strict` checks still fail until Clerk is fully configured.

## Vercel and Clerk setup

1. Install or connect Clerk through Vercel Marketplace, or create matching Clerk
   development/production instances manually.
2. Configure Vercel preview and production environment variables:
   - `AUTH_PROVIDER=clerk`
   - `APP_BASE_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
3. In Clerk, configure allowed application URLs for local, preview, and
   production origins.
4. Use the production origin `https://thedndcompanion.com` for the production
   Clerk instance.
5. Enable the MVP sign-up/sign-in methods in Clerk. Email/password is sufficient
   for first campaign testing; social providers can be added later if onboarding
   feedback requires them.
6. Keep account recovery and email verification enabled in Clerk before inviting
   real campaign users.

The application mounts Clerk's App Router components at:

- `/sign-in/[[...sign-in]]`
- `/sign-up/[[...sign-up]]`

Both routes use path-based Clerk routing and preserve the validated `next` query
parameter so campaign invite links return users to `/invite/[token]` after auth.

## Account flows

- `/sign-in` renders the Clerk sign-in component in managed mode.
- `/sign-up` renders the Clerk sign-up component in managed mode.
- Clerk provides recovery and account-management flows through its hosted
  component state.
- The protected app shell exposes Clerk account controls and sign-out when
  `AUTH_PROVIDER=clerk`.
- In local mode, `/sign-in` keeps the deterministic contributor form and the app
  shell keeps the local cookie sign-out action.

## Campaign identity compatibility

The app's authorization model uses internal UUID user IDs in `users.id`,
`campaign_memberships.user_id`, campaign ownership columns, and related tables.
Clerk user IDs are stable string subjects, so they are not stored directly in
membership foreign keys.

Migration `0014_clerk_user_identity.sql` adds:

- `users.clerk_user_id`
- a unique partial index on non-null `clerk_user_id`

At request time, a signed-in Clerk user is resolved into an app `AuthUser`:

1. Read the verified Clerk user ID and primary email.
2. If a `users.clerk_user_id` row already exists, update its name from Clerk,
   update its email when the new primary email is not already owned by another
   app user row, and return the app UUID.
3. Otherwise insert a new user row, or link an existing row with the same email
   if it has not already been linked to a different Clerk subject.
4. Use the returned app UUID for all campaign membership and invite checks.

This keeps the existing permission queries intact and avoids webhook
eventual-consistency races during first sign-in and invite acceptance.

## Migration from local auth

The same linking flow also covers any previous managed-auth users that already
have a matching email row in Postgres.

The local provider derives deterministic UUIDs from an email address. Clerk uses
a separate string subject, and the app links it through `users.clerk_user_id`.

Before retaining any local test campaign in production:

1. Create and verify the real Clerk account.
2. Sign in once so the app can link `users.clerk_user_id` to the existing email
   row or create a new user row.
3. Verify campaign access with the Clerk account.
4. If an old local account used a different email, move campaign ownership,
   memberships, and authored references to the Clerk-linked app UUID in a single
   database transaction.

For disposable bootstrap data, create a new campaign with the Clerk account
instead of migrating the local identity.

## User deletion and retention behavior

Clerk deletion removes the external account and future sign-in ability. The app
does not cascade-delete campaign data automatically from a Clerk webhook in this
MVP slice. Existing campaign memberships, notes, and authored references remain
in Postgres under the app UUID for table continuity and auditability.

If deletion workflows become product requirements, add a separate ticket for
Clerk webhooks and explicit retention policy enforcement.

## Verification

Run the standard repository checks, then test with `AUTH_PROVIDER=clerk`:

1. Create an account through `/sign-up`.
2. Sign in, sign out, and sign in again.
3. Open a campaign invite before sign-in and confirm the Clerk redirect returns
   to the invite.
4. Accept the invite and confirm the new player membership uses the app UUID
   linked from `users.clerk_user_id`.
5. Use Clerk's recovery flow for the account.
6. Confirm an unauthenticated request to a protected route redirects to
   `/sign-in?next=...`.
