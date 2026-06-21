# Campaign Memory Retrieval

Campaign memory retrieval is the deterministic grounding layer that future AI
Q&A, recap, and prep flows should call before composing any answer. It does not
call an LLM and it does not store hidden memory. It turns already-authorized
campaign data into cited retrieval results.

## Current Source Set

`retrieveCampaignMemoryForUser()` builds a corpus from:

- session notes
- session recaps
- unresolved session hooks
- campaign entities, including linked session and mention backlink context
- rule snippets
- character summaries
- owner/DM-authorized character progression milestones and added features

The current implementation is lexical and intentionally inspectable. It scores
title, summary, body, aliases, tags, and reference labels so the MVP can support
grounded questions before pgvector/embedding infrastructure exists.

## Permission Contract

Retrieval must always happen after campaign membership is resolved.

`apps/web/src/memory/repository.ts` first calls
`getDatabaseCampaignAccessForUser()`, then loads data through the existing
membership-aware repositories:

- `listSessionsForUser()`
- `listEntitiesWithBacklinksForUser()`
- `listRuleSnippetsForUser()`
- `listCharacterSummariesForUser()`

The pure corpus builder also applies `canAccessVisibility()` before creating
entity, rule, or character memory documents. This keeps DM-only material out of
player retrieval even if a future caller accidentally passes a mixed corpus.
Entity backlink queries apply the same membership and visibility checks before
the backlink context reaches the corpus builder.

## Grounding Contract

Every result carries:

- `sourceType`
- `sourceId`
- `sourcePath`
- `title`
- `excerpt`
- `matchedTerms`
- `score`

Answer composition must cite these results and should never answer from campaign
memory without at least one retrieved grounding result. If a query returns no
results, the answer layer should say it does not have grounded campaign context.

## Future Vector Path

The stable unit for embeddings is `CampaignMemoryDocument`. A future pgvector
table can store embeddings by `id`, `campaignId`, `sourceType`, and `sourceId`
without changing answer composition. Lexical retrieval can remain as a fallback
or hybrid reranker for recency, exact-name matches, aliases, and rule terms.

## Non-Goals

- autonomous agents
- unrestricted internet retrieval
- hidden long-term memory outside the campaign database
- answering without citations
