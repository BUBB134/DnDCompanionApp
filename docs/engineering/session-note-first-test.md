# Session Note First-Test Checklist

Use this checklist before the first live campaign and after changes to the
session editor. Test with a saved campaign and disposable session data.

## Desktop Keyboard Flow

1. Create a session and confirm the control reports `Unsaved changes` after the
   first edit.
2. Add, reorder, and remove note blocks using only the keyboard.
3. Type `[[`, navigate suggestions with Arrow Up and Arrow Down, select with
   Enter and Tab, and dismiss with Escape.
4. Save and confirm the control moves through `Saving session...` to `Saved`.
5. Reload and confirm the saved title, blocks, links, hooks, and tags return.
6. Edit the saved session and repeat the save/reload check.

## Save Failure And Recovery

1. Temporarily interrupt the database connection or use an invalid submission
   in a non-production environment.
2. Submit and confirm the page reports `Save failed`, keeps the entered values,
   and exposes `Retry save`.
3. Restore connectivity, retry, and confirm the save succeeds without duplicate
   blocks or entities.
4. Make an unsaved note edit, reload the same browser tab, and confirm the
   temporary draft is recovered.
5. Confirm `Discard recovered draft` restores the last server-backed note.
6. Save a recovered draft and reload again. Confirm the temporary recovery
   notice is gone because the successful save cleared it.

## Mobile Touch Flow

Repeat the main workflow at 390x844:

1. Confirm fields, block controls, suggestions, and the sticky save control are
   reachable without horizontal page scrolling.
2. Open the software keyboard and edit the first and last note blocks.
3. Select a wiki suggestion by touch and confirm focus returns to the note.
4. Use the session jump list to move between older notes and the latest session.
5. Save, reload, and confirm content remains intact.

## Sign-Off

Record the browser, viewport, tester, date, and any accepted limitation in
`docs/engineering/first-campaign-beta-readiness.json`. This checklist provides
the rehearsal steps; it does not replace production evidence required by
DND-52.
