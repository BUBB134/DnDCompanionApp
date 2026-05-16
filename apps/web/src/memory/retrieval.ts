import type {
  Campaign,
  CampaignCharacterSummary,
  CampaignEntity,
  CampaignMemoryDocument,
  CampaignMemoryMetadata,
  CampaignMemoryResult,
  CampaignMemorySourceType,
  CampaignSession,
  RuleSnippet,
} from "@dnd/types";
import { canAccessVisibility } from "@dnd/types";

export const CAMPAIGN_MEMORY_DEFAULT_LIMIT = 8;
export const CAMPAIGN_MEMORY_MAX_LIMIT = 20;

export type CampaignMemoryCorpusInput = {
  campaign: Campaign;
  characters?: readonly CampaignCharacterSummary[];
  entities?: readonly CampaignEntity[];
  rules?: readonly RuleSnippet[];
  sessions?: readonly CampaignSession[];
};

export type CampaignMemoryRetrievalOptions = {
  limit?: number;
  sourceTypes?: readonly CampaignMemorySourceType[];
};

type ScoredDocument = {
  document: CampaignMemoryDocument;
  matchedTerms: string[];
  score: number;
};

export function createCampaignMemoryDocuments({
  campaign,
  characters = [],
  entities = [],
  rules = [],
  sessions = [],
}: CampaignMemoryCorpusInput): CampaignMemoryDocument[] {
  return [
    ...sessions.flatMap((session) =>
      createSessionMemoryDocuments(campaign, session),
    ),
    ...entities
      .filter((entity) => canAccessVisibility(campaign.role, entity.visibility))
      .map((entity) => createEntityMemoryDocument(campaign, entity)),
    ...rules
      .filter((rule) => canAccessVisibility(campaign.role, rule.visibility))
      .map((rule) => createRuleMemoryDocument(campaign, rule)),
    ...characters
      .filter((character) =>
        canAccessVisibility(campaign.role, character.visibility),
      )
      .map((character) => createCharacterMemoryDocument(campaign, character)),
  ];
}

export function retrieveCampaignMemory(
  query: string,
  documents: readonly CampaignMemoryDocument[],
  options: CampaignMemoryRetrievalOptions = {},
): CampaignMemoryResult[] {
  const sourceTypeSet = options.sourceTypes
    ? new Set(options.sourceTypes)
    : null;
  const terms = tokenizeQuery(query);
  const normalizedPhrase = normalizeSearchText(query);
  const limit = normalizeLimit(options.limit);

  return documents
    .filter(
      (document) => !sourceTypeSet || sourceTypeSet.has(document.sourceType),
    )
    .flatMap((document): ScoredDocument[] => {
      const score = scoreDocument(document, terms, normalizedPhrase);

      if (score.score <= 0) {
        return [];
      }

      return [
        {
          document,
          matchedTerms: score.matchedTerms,
          score: score.score,
        },
      ];
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.document.title.localeCompare(right.document.title);
    })
    .slice(0, limit)
    .map(({ document, matchedTerms, score }) => ({
      ...document,
      excerpt: createExcerpt(document, matchedTerms),
      matchedTerms,
      score,
    }));
}

function createSessionMemoryDocuments(
  campaign: Campaign,
  session: CampaignSession,
): CampaignMemoryDocument[] {
  const documents: CampaignMemoryDocument[] = [];
  const sessionKeywords = [
    session.title,
    ...session.taggedEntities.map((entity) => entity.name),
    ...session.notesDocument.blocks.flatMap((block) =>
      block.references.map((reference) => reference.label),
    ),
  ];

  if (session.notes.trim()) {
    documents.push({
      body: session.notes,
      campaignId: campaign.id,
      grounding: createGrounding(
        "session-notes",
        session.id,
        session.title,
        "sessions.notes",
      ),
      id: `session-notes:${session.id}`,
      keywords: sessionKeywords,
      metadata: {
        blockCount: session.notesDocument.blocks.length,
        title: session.title,
      },
      sourceId: session.id,
      sourceType: "session-notes",
      summary: session.recap,
      title: `${session.title} notes`,
      updatedAt: session.updatedAt,
      visibility: "player-safe",
    });
  }

  if (session.recap.trim()) {
    documents.push({
      body: session.recap,
      campaignId: campaign.id,
      grounding: createGrounding(
        "session-recap",
        session.id,
        session.title,
        "sessions.recap",
      ),
      id: `session-recap:${session.id}`,
      keywords: sessionKeywords,
      metadata: {
        title: session.title,
      },
      sourceId: session.id,
      sourceType: "session-recap",
      summary: session.recap,
      title: `${session.title} recap`,
      updatedAt: session.updatedAt,
      visibility: "player-safe",
    });
  }

  for (const [index, hook] of session.unresolvedHooks.entries()) {
    documents.push({
      body: hook,
      campaignId: campaign.id,
      grounding: createGrounding(
        "session-hook",
        session.id,
        session.title,
        `sessions.unresolved_hooks[${index}]`,
      ),
      id: `session-hook:${session.id}:${index}`,
      keywords: sessionKeywords,
      metadata: {
        hookIndex: index,
        title: session.title,
      },
      sourceId: session.id,
      sourceType: "session-hook",
      summary: hook,
      title: `${session.title} unresolved hook`,
      updatedAt: session.updatedAt,
      visibility: "player-safe",
    });
  }

  return documents;
}

function createEntityMemoryDocument(
  campaign: Campaign,
  entity: CampaignEntity,
): CampaignMemoryDocument {
  return {
    body: [entity.summary, entity.description].filter(Boolean).join("\n\n"),
    campaignId: campaign.id,
    grounding: createGrounding("entity", entity.id, entity.name, "entities"),
    id: `entity:${entity.id}`,
    keywords: [entity.name, entity.type, entity.summary],
    metadata: {
      entityType: entity.type,
    },
    sourceId: entity.id,
    sourceType: "entity",
    summary: entity.summary,
    title: entity.name,
    visibility: entity.visibility,
  };
}

function createRuleMemoryDocument(
  campaign: Campaign,
  rule: RuleSnippet,
): CampaignMemoryDocument {
  return {
    body: rule.body,
    campaignId: campaign.id,
    grounding: createGrounding(
      "rule",
      rule.id,
      rule.title,
      "rule_snippets",
    ),
    id: `rule:${rule.id}`,
    keywords: [
      rule.title,
      rule.slug.replaceAll("-", " "),
      rule.summary,
      rule.category,
      ...(rule.aliases ?? []),
      ...(rule.tags ?? []),
    ],
    metadata: compactMetadata({
      category: rule.category,
      contentKey: rule.contentKey ?? null,
      source: rule.source ?? null,
      sourceVersion: rule.sourceVersion ?? null,
    }),
    sourceId: rule.id,
    sourceType: "rule",
    summary: rule.summary,
    title: rule.title,
    visibility: rule.visibility,
  };
}

function createCharacterMemoryDocument(
  campaign: Campaign,
  character: CampaignCharacterSummary,
): CampaignMemoryDocument {
  const classLine = character.className
    ? `Level ${character.level} ${character.className}`
    : `Level ${character.level} character`;

  return {
    body: [classLine, character.summary].filter(Boolean).join("\n\n"),
    campaignId: campaign.id,
    grounding: createGrounding(
      "character",
      character.id,
      character.name,
      "characters",
    ),
    id: `character:${character.id}`,
    keywords: [
      character.name,
      character.summary,
      character.className ?? "",
      String(character.level),
    ],
    metadata: {
      className: character.className ?? null,
      level: character.level,
    },
    sourceId: character.id,
    sourceType: "character",
    summary: character.summary || classLine,
    title: character.name,
    visibility: character.visibility,
  };
}

function scoreDocument(
  document: CampaignMemoryDocument,
  terms: readonly string[],
  normalizedPhrase: string,
) {
  const normalizedTitle = normalizeSearchText(document.title);
  const normalizedSummary = normalizeSearchText(document.summary);
  const normalizedBody = normalizeSearchText(document.body);
  const normalizedKeywords = normalizeSearchText(document.keywords.join(" "));
  const matchedTerms = new Set<string>();
  let score = sourceTypeWeight(document.sourceType);

  if (terms.length === 0) {
    return {
      matchedTerms: [],
      score,
    };
  }

  if (normalizedPhrase.length >= 3) {
    if (normalizedTitle.includes(normalizedPhrase)) {
      score += 80;
    }

    if (normalizedSummary.includes(normalizedPhrase)) {
      score += 55;
    }

    if (normalizedKeywords.includes(normalizedPhrase)) {
      score += 45;
    }

    if (normalizedBody.includes(normalizedPhrase)) {
      score += 35;
    }
  }

  for (const term of terms) {
    let termMatched = false;

    if (normalizedTitle.includes(term)) {
      score += 20;
      termMatched = true;
    }

    if (normalizedKeywords.includes(term)) {
      score += 16;
      termMatched = true;
    }

    if (normalizedSummary.includes(term)) {
      score += 12;
      termMatched = true;
    }

    if (normalizedBody.includes(term)) {
      score += 8;
      termMatched = true;
    }

    if (termMatched) {
      matchedTerms.add(term);
    }
  }

  if (matchedTerms.size === 0) {
    return {
      matchedTerms: [],
      score: 0,
    };
  }

  return {
    matchedTerms: [...matchedTerms],
    score,
  };
}

function createExcerpt(
  document: CampaignMemoryDocument,
  matchedTerms: readonly string[],
) {
  const text = [document.summary, document.body]
    .map((value) => value.trim())
    .find(Boolean) ?? document.title;
  const normalizedText = normalizeSearchText(text);
  const firstMatchIndex = matchedTerms
    .map((term) => normalizedText.indexOf(term))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0] ?? 0;
  const start = Math.max(0, firstMatchIndex - 70);
  const end = Math.min(text.length, firstMatchIndex + 190);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function tokenizeQuery(query: string) {
  return [
    ...new Set(
      normalizeSearchText(query)
        .split(" ")
        .map((term) => term.trim())
        .filter((term) => term.length >= 2),
    ),
  ];
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeLimit(limit = CAMPAIGN_MEMORY_DEFAULT_LIMIT) {
  if (!Number.isFinite(limit)) {
    return CAMPAIGN_MEMORY_DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(CAMPAIGN_MEMORY_MAX_LIMIT, Math.floor(limit)));
}

function createGrounding(
  sourceType: CampaignMemorySourceType,
  sourceId: string,
  label: string,
  sourcePath: string,
) {
  return {
    label,
    sourceId,
    sourcePath,
    sourceType,
  };
}

function compactMetadata(metadata: CampaignMemoryMetadata) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== null),
  );
}

function sourceTypeWeight(sourceType: CampaignMemorySourceType) {
  const weights: Record<CampaignMemorySourceType, number> = {
    character: 4,
    entity: 5,
    rule: 5,
    "session-hook": 4,
    "session-notes": 6,
    "session-recap": 6,
  };

  return weights[sourceType];
}
