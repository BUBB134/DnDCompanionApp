import type {
  CampaignCharacterSummary,
  CampaignEntitySummary,
  EntityType,
  RuleSnippet,
  SessionNoteDocument,
  SessionNoteReferenceType,
} from "@dnd/types";
import { entityTypes } from "@dnd/types";
import { normalizeSessionNoteDocument } from "@/sessions/note-document";
import { extractWikiLinkMentions } from "@/sessions/wiki-links";

export const SESSION_NOTE_SUGGESTION_LIMIT = 8;

export type WikiLinkSuggestionPrefix = EntityType | "character" | "entity" | "rule";

export type ActiveWikiLinkTrigger = {
  cursorOffset: number;
  prefix: WikiLinkSuggestionPrefix | null;
  query: string;
  rawQuery: string;
  startOffset: number;
};

export type SessionNoteSuggestionKind =
  | "character"
  | "create-entity"
  | "entity"
  | "rule";

export type SessionNoteSuggestion = {
  detail: string;
  id: string;
  kind: SessionNoteSuggestionKind;
  label: string;
  metadata: {
    entityType?: EntityType;
    source: "campaign" | "characters" | "inline-create" | "rules";
    targetId?: string;
    targetType?: SessionNoteReferenceType;
  };
  replacement: string;
  score: number;
  typeLabel: string;
};

type SuggestionContext = {
  characters?: readonly CampaignCharacterSummary[];
  document: SessionNoteDocument;
  entities: readonly CampaignEntitySummary[];
  rules: readonly RuleSnippet[];
};

type SuggestionCandidate = Omit<SessionNoteSuggestion, "score"> & {
  searchText: string;
  sortLabel: string;
};

type MentionUsage = {
  labels: Map<string, number>;
  targetIds: Map<string, number>;
};

const entityTypeLabels: Record<EntityType, string> = {
  faction: "Faction",
  item: "Item",
  location: "Location",
  npc: "NPC",
  quest: "Quest",
};

export function getActiveWikiLinkTrigger(
  text: string,
  cursorOffset: number,
): ActiveWikiLinkTrigger | null {
  const cursor = Math.max(0, Math.min(cursorOffset, text.length));
  const beforeCursor = text.slice(0, cursor);
  const startOffset = beforeCursor.lastIndexOf("[[");

  if (startOffset < 0) {
    return null;
  }

  const rawQuery = beforeCursor.slice(startOffset + 2);

  if (
    rawQuery.length > 180 ||
    rawQuery.includes("[") ||
    rawQuery.includes("]") ||
    rawQuery.includes("\n") ||
    rawQuery.includes("\r")
  ) {
    return null;
  }

  const parsedQuery = parseSuggestionQuery(rawQuery);

  return {
    cursorOffset: cursor,
    prefix: parsedQuery.prefix,
    query: parsedQuery.query,
    rawQuery,
    startOffset,
  };
}

export function createSessionNoteSuggestions(
  trigger: ActiveWikiLinkTrigger,
  context: SuggestionContext,
): SessionNoteSuggestion[] {
  const usage = collectMentionUsage(context.document);
  const candidates = [
    ...createEntityCandidates(trigger, context.entities),
    ...createRuleCandidates(trigger, context.rules),
    ...createCharacterCandidates(trigger, context.characters ?? []),
    ...createInlineEntityCreationCandidates(trigger, context.entities),
  ];

  return candidates
    .flatMap((candidate) => {
      const searchScore = scoreSearchMatch(trigger.query, candidate.searchText);

      if (searchScore === null) {
        return [];
      }

      return [
        {
          ...candidate,
          score:
            searchScore +
            scorePrefixMatch(trigger.prefix, candidate) +
            scoreMentionUsage(candidate, usage),
        },
      ];
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.sortLabel.localeCompare(right.sortLabel);
    })
    .slice(0, SESSION_NOTE_SUGGESTION_LIMIT)
    .map(
      (suggestion): SessionNoteSuggestion => ({
        detail: suggestion.detail,
        id: suggestion.id,
        kind: suggestion.kind,
        label: suggestion.label,
        metadata: suggestion.metadata,
        replacement: suggestion.replacement,
        score: suggestion.score,
        typeLabel: suggestion.typeLabel,
      }),
    );
}

function parseSuggestionQuery(rawQuery: string): {
  prefix: WikiLinkSuggestionPrefix | null;
  query: string;
} {
  const targetPart = rawQuery.split("|", 1)[0] ?? rawQuery;
  const prefixMatch = targetPart.match(/^([a-z-]+)\s*:\s*(.*)$/i);

  if (!prefixMatch) {
    return {
      prefix: null,
      query: targetPart.trim(),
    };
  }

  const prefix = normalizeSuggestionPrefix(prefixMatch[1] ?? "");

  if (!prefix) {
    return {
      prefix: null,
      query: targetPart.trim(),
    };
  }

  return {
    prefix,
    query: (prefixMatch[2] ?? "").trim(),
  };
}

function createEntityCandidates(
  trigger: ActiveWikiLinkTrigger,
  entities: readonly CampaignEntitySummary[],
): SuggestionCandidate[] {
  if (trigger.prefix === "rule" || trigger.prefix === "character") {
    return [];
  }

  return entities
    .filter(
      (entity) =>
        trigger.prefix === null ||
        trigger.prefix === "entity" ||
        entity.type === trigger.prefix,
    )
    .map((entity) => {
      const typeLabel = entityTypeLabels[entity.type];

      return {
        detail: entity.summary || `${typeLabel} in this campaign`,
        id: `entity:${entity.id}`,
        kind: "entity",
        label: entity.name,
        metadata: {
          entityType: entity.type,
          source: "campaign",
          targetId: entity.id,
          targetType: "entity",
        },
        replacement: createEntityReplacement(trigger, entity),
        searchText: createSearchText(entity.name, entity.summary, entity.type),
        sortLabel: entity.name,
        typeLabel,
      };
    });
}

function createRuleCandidates(
  trigger: ActiveWikiLinkTrigger,
  rules: readonly RuleSnippet[],
): SuggestionCandidate[] {
  if (trigger.prefix && trigger.prefix !== "rule") {
    return [];
  }

  return rules.map((rule) => ({
    detail: rule.summary || rule.category,
    id: `rule:${rule.id}`,
    kind: "rule",
    label: rule.title,
    metadata: {
      source: "rules",
      targetId: rule.id,
      targetType: "rule",
    },
    replacement: `[[rule: ${rule.title}]]`,
    searchText: createSearchText(
      rule.title,
      rule.slug.replaceAll("-", " "),
      rule.summary,
      ...rule.aliases,
    ),
    sortLabel: rule.title,
    typeLabel: "Rule",
  }));
}

function createCharacterCandidates(
  trigger: ActiveWikiLinkTrigger,
  characters: readonly CampaignCharacterSummary[],
): SuggestionCandidate[] {
  if (trigger.prefix && trigger.prefix !== "character") {
    return [];
  }

  return characters.map((character) => ({
    detail: character.className
      ? `Level ${character.level} ${character.className}`
      : character.summary || "Campaign character",
    id: `character:${character.id}`,
    kind: "character",
    label: character.name,
    metadata: {
      source: "characters",
      targetId: character.id,
      targetType: "character",
    },
    replacement: `[[character: ${character.name}]]`,
    searchText: createSearchText(
      character.name,
      character.summary,
      character.className ?? "",
    ),
    sortLabel: character.name,
    typeLabel: "Character",
  }));
}

function createInlineEntityCreationCandidates(
  trigger: ActiveWikiLinkTrigger,
  entities: readonly CampaignEntitySummary[],
): SuggestionCandidate[] {
  const label = normalizeCreatedEntityLabel(trigger.query);

  if (
    !label ||
    trigger.prefix === "rule" ||
    trigger.prefix === "character"
  ) {
    return [];
  }

  const creatableTypes = getCreatableEntityTypes(trigger.prefix);

  return creatableTypes
    .filter(
      (type) =>
        !entities.some(
          (entity) =>
            entity.type === type &&
            normalizeSuggestionText(entity.name) === normalizeSuggestionText(label),
        ),
    )
    .map((type) => ({
      detail: "Create on save",
      id: `create-entity:${type}:${normalizeSuggestionText(label)}`,
      kind: "create-entity",
      label,
      metadata: {
        entityType: type,
        source: "inline-create",
        targetType: "entity",
      },
      replacement: `[[${type}: ${label}]]`,
      searchText: createSearchText(label, type, entityTypeLabels[type]),
      sortLabel: `${entityTypeLabels[type]} ${label}`,
      typeLabel: `New ${entityTypeLabels[type]}`,
    }));
}

function createEntityReplacement(
  trigger: ActiveWikiLinkTrigger,
  entity: CampaignEntitySummary,
) {
  if (trigger.prefix === entity.type) {
    return `[[${entity.type}: ${entity.name}]]`;
  }

  return `[[${entity.name}]]`;
}

function collectMentionUsage(document: SessionNoteDocument): MentionUsage {
  const usage: MentionUsage = {
    labels: new Map(),
    targetIds: new Map(),
  };

  for (const block of normalizeSessionNoteDocument(document).blocks) {
    for (const reference of block.references) {
      incrementCount(usage.targetIds, reference.targetId);
      incrementCount(usage.labels, normalizeSuggestionText(reference.label));
    }

    for (const mention of extractWikiLinkMentions(block.text)) {
      incrementCount(usage.labels, normalizeSuggestionText(mention.targetLabel));
    }
  }

  return usage;
}

function scoreSearchMatch(query: string, searchText: string) {
  const normalizedQuery = normalizeSuggestionText(query);

  if (!normalizedQuery) {
    return 10;
  }

  const normalizedSearchText = normalizeSuggestionText(searchText);

  if (normalizedSearchText === normalizedQuery) {
    return 120;
  }

  if (normalizedSearchText.startsWith(normalizedQuery)) {
    return 95;
  }

  if (
    normalizedSearchText
      .split(" ")
      .some((word) => word.startsWith(normalizedQuery))
  ) {
    return 75;
  }

  if (normalizedSearchText.includes(normalizedQuery)) {
    return 50;
  }

  return null;
}

function scorePrefixMatch(
  prefix: WikiLinkSuggestionPrefix | null,
  candidate: SuggestionCandidate,
) {
  if (!prefix) {
    return 0;
  }

  if (prefix === "rule" && candidate.kind === "rule") {
    return 35;
  }

  if (prefix === "character" && candidate.kind === "character") {
    return 35;
  }

  if (
    prefix === "entity" &&
    (candidate.kind === "entity" || candidate.kind === "create-entity")
  ) {
    return 25;
  }

  if (candidate.metadata.entityType === prefix) {
    return 45;
  }

  return 0;
}

function scoreMentionUsage(
  candidate: SuggestionCandidate,
  usage: MentionUsage,
) {
  const labelScore =
    (usage.labels.get(normalizeSuggestionText(candidate.label)) ?? 0) * 18;
  const idScore = candidate.metadata.targetId
    ? (usage.targetIds.get(candidate.metadata.targetId) ?? 0) * 24
    : 0;

  return labelScore + idScore;
}

function getCreatableEntityTypes(
  prefix: WikiLinkSuggestionPrefix | null,
): EntityType[] {
  if (isEntityType(prefix)) {
    return [prefix];
  }

  if (prefix === "entity") {
    return [...entityTypes];
  }

  return [...entityTypes];
}

function normalizeCreatedEntityLabel(query: string) {
  const label = query.replace(/\s+/g, " ").trim();

  if (label.length < 2 || label.includes("[") || label.includes("]")) {
    return "";
  }

  return label.slice(0, 120);
}

function createSearchText(...parts: string[]) {
  return parts.filter(Boolean).join(" ");
}

function incrementCount(counts: Map<string, number>, key: string) {
  if (!key) {
    return;
  }

  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function normalizeSuggestionPrefix(value: string): WikiLinkSuggestionPrefix | null {
  const normalizedValue = value.trim().toLowerCase();

  if (
    normalizedValue === "character" ||
    normalizedValue === "entity" ||
    normalizedValue === "rule" ||
    isEntityType(normalizedValue)
  ) {
    return normalizedValue;
  }

  return null;
}

function normalizeSuggestionText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isEntityType(value: unknown): value is EntityType {
  return entityTypes.includes(value as EntityType);
}
