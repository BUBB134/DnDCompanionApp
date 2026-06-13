# Character Companion

The character companion is a campaign-scoped, lightweight profile for table use.
It deliberately does not replace a full character sheet.

## Access model

- DMs can list, open, and edit every character in their campaign.
- Players can list and fully manage characters they own.
- Players can list the short profile of other `player-safe` characters.
- Other players cannot open backstory, goals, relationships, inventory notes,
  ability summaries, or personal notes.
- `dm-only` characters remain visible to their owner and campaign DMs.
- Personal notes are always limited to the owner and campaign DMs.

Every repository query checks campaign membership. Mutations additionally require
the signed-in user to be either the character owner or a campaign DM.

## Data shape

The MVP profile stores:

- name, class, level, ancestry/species, and background
- short player-visible profile
- backstory, goals, relationships, and inventory notes
- owner/DM-only personal notes
- short ability summaries with an optional trigger

Ability summaries are stored as child rows so future spellbook and action-hotbar
work can extend the character without replacing this model.

## Routes

- `/campaigns/[campaignId]/characters` lists visible characters and creates a
  character for the signed-in user.
- `/campaigns/[campaignId]/characters/[characterId]` shows either the full
  owner/DM profile or a player-safe summary.

The campaign dashboard and protected navigation link into the list route for
saved campaigns.
