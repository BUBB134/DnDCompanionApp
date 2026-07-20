# Session Continuity Recaps

DND-36 expands the saved-session recap workflow into a grounded continuity tool.
Campaign members can generate or regenerate a player-safe recap from saved notes,
related campaign memory, and relevant prior continuity. The same operation can
surface unresolved hooks and open questions without creating hidden memory.

## Recap formats

The session flow offers two persisted formats:

- `quick`: a 50-80 word refresher designed for the table and dashboard.
- `detailed`: a 140-220 word narrative recap with more room for important NPCs,
  locations, quests, decisions, and consequences.

The selected format is stored in `sessions.recap_format` and shown in both the
session log and campaign dashboard. Regeneration replaces the saved recap while
keeping its citations inspectable.

## Generation modes

`AI_GROUNDING_MODE` controls recap composition:

- `disabled`: recap generation returns a configuration error.
- `local`: a deterministic notes-only summary supports local development and
  CI without an external API call. Existing manually entered hooks are kept.
- `retrieval`: the server calls the OpenAI Responses API with the configured
  `OPENAI_MODEL` or `gpt-5.5` and a strict JSON schema for the recap and up to
  five grounded unresolved hooks.

The OpenAI request is server-only, does not store the response at OpenAI, and
uses a hard output-token cap. GPT-5-family models receive low reasoning effort
and low text verbosity controls; other model overrides retain the structured
response contract without model-specific controls.

## Grounding and continuity

The service resolves campaign membership before building or retrieving context.
The source set can include:

- the selected session's complete saved notes
- player-safe entities and characters referenced or tagged in those notes
- relevant player-safe prior session recaps
- relevant player-safe unresolved hooks from earlier sessions

The deterministic retrieval query includes the current title, notes, explicit
references, tagged entities, and existing hooks. Quick recaps use up to eight
sources and detailed recaps use up to twelve. The selected session notes always
come first. Current notes are capped at 10,000 characters and entity context is
limited to the entity summary so campaign-wide backlink text cannot leak into a
shared recap.

DM-only entities and character details are excluded even when a DM triggers
generation because the persisted recap and hooks are visible to all campaign
members. Retrieval is visibility-filtered before composition, and the generator
applies a second player-safe filter before sending context.

Every saved recap stores its source type, source id, source path, label, and
excerpt in `sessions.recap_grounding`. Those source citations remain visible in
the session log. Generated hooks are normalized, deduplicated, and merged with
existing manually entered hooks so generation cannot silently delete a table's
continuity notes.

The recap save carries the session's loaded `updated_at` value and persists the
recap, format, grounding, and hooks in one conditional update. If the session
changes while generation is in flight, the update is rejected and the member is
prompted to generate again.

## Design contract

The format chooser and recap state follow the approved Google Stitch `dnd
companion` Arcane System: paper surfaces, narrative display type, teal shared
state, gold continuity accents, clear keyboard focus, 44px controls, and a
mobile-first two-option layout. The dashboard exposes the selected format and
open hooks without changing the underlying permission contract.

## Scope boundary

The workflow summarizes existing campaign memory. It does not autonomously
rewrite the campaign, invent future story events, resolve hooks, or create
private hidden memory.
