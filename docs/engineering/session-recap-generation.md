# Session Recap Generation

DND-12 adds the first lightweight recap workflow for saved sessions. Campaign
members can generate or regenerate a concise recap from the session log after
notes have been saved.

## Generation Modes

`AI_GROUNDING_MODE` controls recap composition:

- `disabled`: recap generation returns a configuration error.
- `local`: a deterministic notes-only summary supports local development and
  CI without an external API call.
- `retrieval`: the server calls the OpenAI Responses API with the configured
  `OPENAI_MODEL` or `gpt-5.5`.

The OpenAI request is server-only, does not store the response at OpenAI, and
uses low reasoning effort and low text verbosity for this short workflow.

## Grounding

The recap service resolves campaign membership first, then builds context from
the existing campaign memory corpus. The source set is deliberately narrow:

- the selected session's saved notes
- player-safe entities referenced or tagged in those notes
- player-safe characters referenced in those notes

DM-only entities are excluded even when a DM triggers generation because the
persisted session recap is visible to all campaign members. Each saved recap
stores its source type, source id, source path, label, and excerpt in
`sessions.recap_grounding`. The session log renders those source citations
beside the recap.

## Scope Boundary

This version produces one concise recap for one session. Unresolved-hook
extraction, multiple recap formats, campaign-wide continuity analysis, and
retrieval-based recap enrichment belong to the advanced recap follow-up.
