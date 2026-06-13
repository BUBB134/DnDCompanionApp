# First Campaign Beta Readiness

DND-52 defines the release gate for the first real-world campaign. This is an
operational checklist, not a substitute for the feature validators or a reason
to expand scope.

The machine-readable assessment is stored in
`docs/engineering/first-campaign-beta-readiness.json`. Update that file with
evidence from each rehearsal. Do not mark a manual check as passed from code
inspection alone.

## Decision Rules

Record `GO` only when:

- every required check in the assessment is `pass`
- the protected `Campaign Beta Readiness` workflow passes against the exact
  production deployment intended for the session
- one DM and one player complete the full journey with separate managed accounts
- the main DM and player journeys pass at a 390x844 viewport
- no unresolved issue can block account access, campaign access, session notes,
  or the character companion during the session

Record `NO-GO` when any required check is `blocked`, `failed`, or
`pending-manual`. Accepted limitations must be visible to the DM and must not
prevent the first-session loop.

## Automated Preflight

Run the repository readiness subset locally:

```bash
npm install
npm run beta:check
npm run lint
npm run typecheck
npm test
npm run build
```

Before the live rehearsal, dispatch `.github/workflows/beta-readiness.yml` with:

- `deployment_url`: the exact Vercel production URL intended for the session

The protected workflow validates the checked-in assessment, production-shaped
environment variables, Supabase connectivity, and the deployed health/sign-in
surface. It ends with `npm run beta:check -- --require-go`, so it cannot report a
ready state while the assessment still contains blockers.

The workflow compares `deployment_url` with the production `APP_BASE_URL`. It
also binds the GO assessment to the workflow revision. `assessedCommit` must name
the fully tested application commit, and only the JSON report and this runbook
may differ between that commit and the revision running the final gate. This
allows evidence to be recorded without letting later application or gate changes
inherit stale approval.

## Test Accounts And Data

Use two new email addresses with inbox access:

- one DM account
- one player account

Do not reuse local-provider identities or share a browser session between roles.
Use a normal browser session for the DM and a private session or separate browser
profile for the player.

Create disposable data with a recognizable assessment marker:

```text
DND-52 YYYY-MM-DD HH:MM
```

Use the marker in the campaign name, session title, and saved notes. Remove the
disposable campaign after evidence is recorded.

## Manual Journey

### 1. Managed Accounts

1. On production, create the DM account.
2. Confirm the account from the received email.
3. Sign in, sign out, and sign in again.
4. Repeat the same sequence with the separate player account.
5. Confirm password recovery reaches the expected account without revealing
   whether arbitrary email addresses exist.

Pass only when both accounts can independently reach the protected app.

### 2. Campaign And Invite

1. As the DM, create a campaign with the assessment marker.
2. Confirm the campaign persists after a reload.
3. Generate a shareable invite link.
4. Open the link in the player's private session while signed out.
5. Sign in and confirm the player returns to the same invite.
6. Accept the invite and confirm player access to the campaign.
7. Confirm the player cannot access DM-only controls.

Pass only when membership and role boundaries survive reloads for both accounts.

### 3. Session Notes

1. As the DM, create a session with the assessment marker.
2. Add at least two note blocks and one wiki-style reference.
3. Save, navigate away, return to the session, and reload the browser.
4. Confirm the exact marker and block content are recovered.
5. Edit the notes, save again, reload, and confirm the edit replaces the prior
   value without duplicate or orphan content.
6. As the player, confirm only player-safe session content is visible.

Pass only when repeated save/reload cycles are predictable enough for live play.

### 4. Character Companion

1. As the player, open the character path from primary navigation.
2. Create or select the first-test character.
3. Confirm name, class/species or equivalent identity, level, and a useful
   at-table summary are available.
4. Reload and confirm the character remains accessible.

Pass only when the player can reach a useful character surface without external
admin intervention.

### 5. Mobile Viewport

Repeat account sign-in, invite acceptance, campaign navigation, session opening,
note editing, and character access at 390x844.

Check that:

- no primary action or field is clipped
- no horizontal page scrolling is required
- focus states and validation messages remain visible
- the mobile navigation exposes every required route
- note editing does not lose content when the keyboard opens or the page reloads

## Manual Evidence Record

Before changing any manual check to `pass`, populate `manualRehearsal` in the
JSON report with:

- `tester`: the person who completed the rehearsal
- `completedAt`: an ISO-8601 timestamp
- `environment`: `production`
- `deploymentUrl`: the exact tested production URL
- `workflowUrl`: the successful protected rehearsal workflow run
- `assessedCommit`: the tested application commit from the report
- `result`: `pass`
- `passedCheckIds`: every manual check proven by that rehearsal
- `notes`: concise evidence or anomalies

The validator rejects passed manual checks without this structured evidence.

## Production Checks

Immediately before the campaign test:

1. Confirm the production deployment points at the intended `main` commit.
2. Run the protected `Campaign Beta Readiness` workflow against that URL.
3. Confirm `/api/health` reports the production environment and healthy database.
4. Confirm the public sign-in page has no deployment-configuration alert.
5. Review current Vercel runtime logs for new authentication, database, or 5xx
   errors created by the rehearsal.
6. Record the workflow URL, deployment URL, commit, date, tester, and results in
   the assessment evidence.

## Accepted First-Test Limitations

- One active invite link exists per campaign; rotation revokes the old link.
- Local contributor identities and data do not automatically transfer to
  managed production accounts.
- Advanced AI, broad redesign, full rules automation, and performance
  benchmarking are outside this gate.

These limitations do not waive authentication, campaign access, note
persistence, mobile usability, or character companion requirements.

## Latest Assessment

Assessment date: 2026-06-13

Assessed application commit: `5c43479`

Decision: **NO-GO**

Current evidence:

- `npm run beta:check`, lint, typecheck, the full test suite, and the production
  build pass on 2026-06-13.
- The local `/sign-in?next=%2F` surface returns HTTP 200 and does not render a
  deployment-configuration alert. This does not replace production auth or
  mobile evidence.
- DND-20 / PR #73 reports passing GitHub Actions and Vercel preview checks for
  managed authentication.
- DND-46 is complete and the repository contains deployment health and protected
  integration smoke tooling.
- Automated validators exist for campaign creation, onboarding, invites,
  membership access, sessions, note persistence contracts, and the responsive
  shell.

Release blockers:

- DND-13 remains in Backlog and no player-facing character route, navigation
  entry, creation flow, or companion screen exists.
- DND-51 remains in Backlog, and a production save/reload rehearsal has not
  signed off first-session note usability.
- Production SMTP/account confirmation, a separate player invite journey, and
  the 390x844 main-flow walkthrough have not been recorded.
- A fresh protected readiness workflow has not passed against the exact
  production deployment intended for the campaign.

The next assessment may change the decision to `GO` only after those blockers
are cleared and their evidence is added to the JSON report.
