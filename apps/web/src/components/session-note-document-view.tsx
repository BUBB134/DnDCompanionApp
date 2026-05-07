import type {
  CampaignCharacterSummary,
  CampaignEntitySummary,
  RuleSnippet,
  SessionNoteBlock,
  SessionNoteDocument,
  SessionNoteReference,
} from "@dnd/types";
import type { ReactNode } from "react";
import { RuleLinkedText } from "@/components/rule-linked-text";
import { createRuleHref } from "@/rules/routing";
import { normalizeSessionNoteDocument } from "@/sessions/note-document";
import { replaceWikiLinksWithLabels } from "@/sessions/wiki-links";

type SessionNoteDocumentViewProps = {
  characters?: readonly CampaignCharacterSummary[];
  document: SessionNoteDocument;
  entities: readonly CampaignEntitySummary[];
  fallbackText: string;
  rules: readonly RuleSnippet[];
};

const blockClasses: Record<SessionNoteBlock["type"], string> = {
  callout:
    "whitespace-pre-wrap border-l-4 border-[#c3943e] bg-white px-3 py-2 text-sm font-semibold leading-6 text-[#5c4212]",
  heading:
    "whitespace-pre-wrap text-base font-semibold leading-6 text-[#17161f]",
  paragraph: "whitespace-pre-wrap text-sm leading-6 text-[#17161f]",
  quote:
    "whitespace-pre-wrap border-l-4 border-[#1f6f78]/45 pl-3 text-sm italic leading-6 text-[#4b4657]",
};

export function SessionNoteDocumentView({
  characters = [],
  document,
  entities,
  fallbackText,
  rules,
}: SessionNoteDocumentViewProps) {
  const blocks = normalizeSessionNoteDocument(
    document,
    fallbackText,
  ).blocks.filter((block) => block.text.trim());

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-3">
      {blocks.map((block) => (
        <LinkedNoteBlock
          className={blockClasses[block.type]}
          characters={characters}
          entities={entities}
          references={block.references}
          key={block.id}
          rules={rules}
          text={block.text}
        />
      ))}
    </div>
  );
}

function LinkedNoteBlock({
  characters,
  className,
  entities,
  references,
  rules,
  text,
}: {
  characters: readonly CampaignCharacterSummary[];
  className: string;
  entities: readonly CampaignEntitySummary[];
  references: readonly SessionNoteReference[];
  rules: readonly RuleSnippet[];
  text: string;
}) {
  const linkedReferences = references
    .flatMap((reference) =>
      resolveVisibleReference(reference, { characters, entities, rules })
        ? [reference]
        : [],
    )
    .sort((left, right) => left.startOffset - right.startOffset);
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const reference of linkedReferences) {
    if (
      reference.startOffset < cursor ||
      reference.startOffset < 0 ||
      reference.endOffset > text.length ||
      reference.endOffset <= reference.startOffset
    ) {
      continue;
    }

    if (reference.startOffset > cursor) {
      parts.push(
        <RuleLinkedText
          as="span"
          key={`text-${cursor}`}
          rules={rules}
          text={replaceWikiLinksWithLabels(text.slice(cursor, reference.startOffset))}
        />,
      );
    }

    parts.push(
      <ReferenceLink
        key={`${reference.targetType}-${reference.targetId}-${reference.startOffset}`}
        reference={reference}
        target={resolveVisibleReference(reference, {
          characters,
          entities,
          rules,
        })}
      />,
    );
    cursor = reference.endOffset;
  }

  if (cursor < text.length) {
    parts.push(
      <RuleLinkedText
        as="span"
        key={`text-${cursor}`}
        rules={rules}
        text={replaceWikiLinksWithLabels(text.slice(cursor))}
      />,
    );
  }

  return <p className={className}>{parts.length > 0 ? parts : text}</p>;
}

function ReferenceLink({
  reference,
  target,
}: {
  reference: SessionNoteReference;
  target: VisibleReferenceTarget | null;
}) {
  const label = reference.label || target?.label || "Reference";

  if (!target) {
    return <span>{label}</span>;
  }

  if (target.href) {
    return (
      <a
        className="rounded-sm bg-[#e7f5f6] px-1 font-semibold text-[#164f56] underline decoration-[#1f6f78]/50 underline-offset-2 transition hover:bg-[#d4ecef] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2"
        href={target.href}
        title={target.typeLabel}
      >
        {label}
      </a>
    );
  }

  return (
    <span
      className="rounded-sm bg-[#fffaf0] px-1 font-semibold text-[#5c4212]"
      title={target.typeLabel}
    >
      {label}
    </span>
  );
}

type VisibleReferenceTarget = {
  href?: string;
  label: string;
  typeLabel: string;
};

function resolveVisibleReference(
  reference: SessionNoteReference,
  context: {
    characters: readonly CampaignCharacterSummary[];
    entities: readonly CampaignEntitySummary[];
    rules: readonly RuleSnippet[];
  },
): VisibleReferenceTarget | null {
  if (reference.targetType === "entity") {
    const entity = context.entities.find(
      (candidate) => candidate.id === reference.targetId,
    );

    return entity
      ? {
          href: `/entities#entity-${entity.id}`,
          label: entity.name,
          typeLabel: formatEntityType(entity.type),
        }
      : null;
  }

  if (reference.targetType === "rule") {
    const rule = context.rules.find(
      (candidate) => candidate.id === reference.targetId,
    );

    return rule
      ? {
          href: createRuleHref(rule.slug),
          label: rule.title,
          typeLabel: "Rule",
        }
      : null;
  }

  if (reference.targetType === "character") {
    const character = context.characters.find(
      (candidate) => candidate.id === reference.targetId,
    );

    return character
      ? {
          label: character.name,
          typeLabel: "Character",
        }
      : null;
  }

  return null;
}

function formatEntityType(type: CampaignEntitySummary["type"]) {
  const labels: Record<CampaignEntitySummary["type"], string> = {
    faction: "Faction",
    item: "Item",
    location: "Location",
    npc: "NPC",
    quest: "Quest",
  };

  return labels[type];
}
