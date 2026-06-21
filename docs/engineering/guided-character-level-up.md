# Guided Character Level-Up

DND-29 adds a focused progression route at
`/campaigns/[campaignId]/characters/[characterId]/level-up`. It extends the
existing lightweight character companion rather than introducing a full
character-sheet or rules-automation system.

## Access model

- Players can level up characters they own.
- Campaign DMs can level up any character in the campaign.
- Other players cannot open the level-up route or read progression history.
- Every load and mutation re-checks campaign membership plus owner/DM access.

The general character edit form keeps the current level read-only. This ensures
level changes pass through the progression workflow and receive a durable
history entry.

## Progression contract

Each completion advances exactly one level and runs in one database
transaction:

1. Re-check the character revision, current level, and owner/DM permission.
2. Advance the character by one level, up to level 20.
3. Insert a `character_level_progressions` history row with the milestone
   summary and added feature reminders.
4. Append those feature reminders to `ability_summaries`.

The transaction rolls back if any step fails, preventing a character level,
history, and action-bar reminders from drifting apart.

## Guided experience

The mobile-first flow asks the player or DM to:

- review the current and target level
- describe the meaningful gameplay or story change
- add concise feature reminders using
  `Name | Summary | Optional trigger`
- review the resulting action reminders before completion

The MVP intentionally asks the table to confirm class rules instead of
automating class progression, feat validation, multiclassing, spell choices, or
resource totals.

## Retrieval and surfacing

Added features use the existing `ability_summaries` path, so they immediately
feed the character action hotbar. Progression rows also become grounded
character documents in campaign memory with the source path
`character_level_progressions`.

Progression data only enters the retrieval corpus after the membership-aware
character repository has confirmed owner/DM access.
