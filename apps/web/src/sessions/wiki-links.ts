import type {
  CampaignCharacterSummary,
  CampaignEntitySummary,
  EntityType,
  RuleSnippet,
  SessionNoteBlock,
  SessionNoteDocument,
  SessionNoteReference,
  SessionNoteReferenceType,
} from "@dnd/types";
import { entityTypes } from "@dnd/types";
import {
  normalizeSessionNoteDocument,
  SESSION_NOTE_MAX_REFERENCES_PER_BLOCK,
} from "@/sessions/note-document";

const wikiLinkPattern = /\[\[([^[\]\r\n]{1,180})\]\]/g;
const wikiEntityTypeLabels: Record<EntityType, string> = {
  faction: "Faction",
  item: "Item",
  location: "Location",
  npc: "NPC",
  quest: "Quest",
};

export type WikiLinkKind =
  | EntityType
  | "character"
  | "entity"
  | "rule";

export type WikiLinkMention = {
  displayLabel: string;
  endOffset: number;
  kind: WikiLinkKind | null;
  rawContent: string;
  startOffset: number;
  targetLabel: string;
};

export type WikiEntityCreationRequest = {
  name: string;
  type: EntityType;
};

export type WikiLinkSummaryItem = {
  label: string;
  tone: "create" | "missing" | "resolved";
  typeLabel: string;
};

type WikiLinkContext = {
  characters?: readonly CampaignCharacterSummary[];
  entities: readonly CampaignEntitySummary[];
  rules: readonly RuleSnippet[];
};

type ResolvedReference = {
  reference: SessionNoteReference;
  typeLabel: string;
};

export function resolveSessionNoteWikiLinks(
  document: SessionNoteDocument,
  context: WikiLinkContext,
) {
  const normalizedDocument = normalizeSessionNoteDocument(document);

  return {
    ...normalizedDocument,
    blocks: normalizedDocument.blocks.map((block) =>
      resolveWikiLinksForBlock(block, context),
    ),
  } satisfies SessionNoteDocument;
}

export function collectWikiEntityCreationRequests(
  document: SessionNoteDocument,
  entities: readonly CampaignEntitySummary[],
): WikiEntityCreationRequest[] {
  const requests = new Map<string, WikiEntityCreationRequest>();

  for (const block of normalizeSessionNoteDocument(document).blocks) {
    for (const mention of extractWikiLinkMentions(block.text)) {
      if (!isEntityType(mention.kind)) {
        continue;
      }

      const name = mention.targetLabel.trim();

      if (!name || findEntityReference(name, entities, mention.kind)) {
        continue;
      }

      requests.set(`${mention.kind}:${normalizeWikiLabel(name)}`, {
        name,
        type: mention.kind,
      });
    }
  }

  return [...requests.values()];
}

export function createWikiLinkSummaryItems(
  document: SessionNoteDocument,
  context: WikiLinkContext,
): WikiLinkSummaryItem[] {
  const items = new Map<string, WikiLinkSummaryItem>();

  for (const block of normalizeSessionNoteDocument(document).blocks) {
    for (const mention of extractWikiLinkMentions(block.text)) {
      const resolved = resolveWikiLinkMention(mention, context);
      const creationType = isEntityType(mention.kind) ? mention.kind : null;
      const key = `${mention.kind ?? "any"}:${normalizeWikiLabel(
        mention.targetLabel,
      )}`;

      if (resolved) {
        items.set(key, {
          label: mention.displayLabel,
          tone: "resolved",
          typeLabel: resolved.typeLabel,
        });
      } else if (creationType) {
        items.set(key, {
          label: mention.targetLabel,
          tone: "create",
          typeLabel: wikiEntityTypeLabels[creationType],
        });
      } else {
        items.set(key, {
          label: mention.displayLabel,
          tone: "missing",
          typeLabel: mention.kind === "rule" ? "Rule" : "Reference",
        });
      }
    }
  }

  return [...items.values()];
}

export function extractWikiLinkMentions(text: string): WikiLinkMention[] {
  const mentions: WikiLinkMention[] = [];

  for (const match of text.matchAll(wikiLinkPattern)) {
    const startOffset = match.index;
    const rawContent = match[1]?.trim() ?? "";

    if (startOffset === undefined || !rawContent) {
      continue;
    }

    const parsedLink = parseWikiLinkContent(rawContent);

    if (!parsedLink.targetLabel) {
      continue;
    }

    mentions.push({
      ...parsedLink,
      endOffset: startOffset + match[0].length,
      rawContent,
      startOffset,
    });
  }

  return mentions;
}

export function replaceWikiLinksWithLabels(text: string) {
  return text.replace(wikiLinkPattern, (_match, rawContent: string) => {
    const parsedLink = parseWikiLinkContent(rawContent.trim());

    return parsedLink.displayLabel || parsedLink.targetLabel || rawContent;
  });
}

function resolveWikiLinksForBlock(
  block: SessionNoteBlock,
  context: WikiLinkContext,
): SessionNoteBlock {
  const wikiReferences = extractWikiLinkMentions(block.text)
    .flatMap((mention): SessionNoteReference[] => {
      const resolvedReference = resolveWikiLinkMention(mention, context);

      return resolvedReference ? [resolvedReference.reference] : [];
    })
    .slice(0, SESSION_NOTE_MAX_REFERENCES_PER_BLOCK);
  const preservedReferences = block.references.filter(
    (reference) =>
      !wikiReferences.some((wikiReference) =>
        rangesOverlap(reference, wikiReference),
      ),
  );

  return {
    ...block,
    references: [...preservedReferences, ...wikiReferences]
      .sort((left, right) => left.startOffset - right.startOffset)
      .slice(0, SESSION_NOTE_MAX_REFERENCES_PER_BLOCK),
  };
}

function resolveWikiLinkMention(
  mention: WikiLinkMention,
  context: WikiLinkContext,
): ResolvedReference | null {
  const entity = findEntityReference(
    mention.targetLabel,
    context.entities,
    isEntityType(mention.kind) ? mention.kind : undefined,
  );

  if (entity && mention.kind !== "rule" && mention.kind !== "character") {
    return {
      reference: createReference(mention, "entity", entity.id),
      typeLabel: wikiEntityTypeLabels[entity.type],
    };
  }

  const rule = findRuleReference(mention.targetLabel, context.rules);

  if (rule && (mention.kind === "rule" || mention.kind === null)) {
    return {
      reference: createReference(mention, "rule", rule.id),
      typeLabel: "Rule",
    };
  }

  const character = findCharacterReference(
    mention.targetLabel,
    context.characters ?? [],
  );

  if (character && (mention.kind === "character" || mention.kind === null)) {
    return {
      reference: createReference(mention, "character", character.id),
      typeLabel: "Character",
    };
  }

  return null;
}

function createReference(
  mention: WikiLinkMention,
  targetType: SessionNoteReferenceType,
  targetId: string,
): SessionNoteReference {
  return {
    endOffset: mention.endOffset,
    label: mention.displayLabel,
    startOffset: mention.startOffset,
    targetId,
    targetType,
  };
}

function parseWikiLinkContent(rawContent: string) {
  const [targetPart, aliasPart] = rawContent.split("|", 2);
  const prefixMatch = targetPart?.match(/^([a-z-]+)\s*:\s*(.+)$/i);
  const rawKind = prefixMatch?.[1]?.trim().toLowerCase() ?? "";
  const kind = normalizeWikiLinkKind(rawKind);
  const targetLabel = (
    kind && prefixMatch ? (prefixMatch[2] ?? "") : (targetPart ?? "")
  ).trim();
  const displayLabel = (aliasPart?.trim() || targetLabel).trim();

  return {
    displayLabel,
    kind,
    targetLabel,
  };
}

function normalizeWikiLinkKind(value: string): WikiLinkKind | null {
  if (!value) {
    return null;
  }

  if (
    value === "character" ||
    value === "entity" ||
    value === "rule" ||
    isEntityType(value)
  ) {
    return value;
  }

  return null;
}

function findEntityReference(
  label: string,
  entities: readonly CampaignEntitySummary[],
  type?: EntityType,
) {
  const normalizedId = label.trim();
  const normalizedLabel = normalizeWikiLabel(label);

  return entities.find(
    (entity) =>
      entity.id === normalizedId &&
      (type === undefined || entity.type === type),
  ) ?? entities.find(
    (entity) =>
      normalizeWikiLabel(entity.name) === normalizedLabel &&
      (type === undefined || entity.type === type),
  );
}

function findCharacterReference(
  label: string,
  characters: readonly CampaignCharacterSummary[],
) {
  const normalizedLabel = normalizeWikiLabel(label);

  return characters.find(
    (character) => normalizeWikiLabel(character.name) === normalizedLabel,
  );
}

function findRuleReference(label: string, rules: readonly RuleSnippet[]) {
  const normalizedLabel = normalizeWikiLabel(label);

  return rules.find((rule) =>
    [rule.title, rule.slug.replaceAll("-", " "), ...rule.aliases].some(
      (candidate) => normalizeWikiLabel(candidate) === normalizedLabel,
    ),
  );
}

function normalizeWikiLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isEntityType(value: unknown): value is EntityType {
  return entityTypes.includes(value as EntityType);
}

function rangesOverlap(
  left: Pick<SessionNoteReference, "endOffset" | "startOffset">,
  right: Pick<SessionNoteReference, "endOffset" | "startOffset">,
) {
  return left.startOffset < right.endOffset && right.startOffset < left.endOffset;
}
