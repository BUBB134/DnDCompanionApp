import {
  sessionNoteBlockTypes,
  sessionNoteReferenceTypes,
  type SessionNoteBlock,
  type SessionNoteBlockType,
  type SessionNoteDocument,
  type SessionNoteReference,
  type SessionNoteReferenceType,
} from "@dnd/types";

export const SESSION_NOTE_DOCUMENT_VERSION = 1;
export const SESSION_NOTE_MAX_BLOCKS = 80;
export const SESSION_NOTE_MAX_BLOCK_TEXT_LENGTH = 2000;
export const SESSION_NOTE_MAX_REFERENCES_PER_BLOCK = 32;

export const sessionNoteBlockTypeLabels: Record<SessionNoteBlockType, string> = {
  callout: "Callout",
  heading: "Heading",
  paragraph: "Paragraph",
  quote: "Quote",
};

export function createEmptySessionNoteDocument(): SessionNoteDocument {
  return {
    blocks: [createSessionNoteBlock()],
    version: SESSION_NOTE_DOCUMENT_VERSION,
  };
}

export function createSessionNoteBlock(
  type: SessionNoteBlockType = "paragraph",
  text = "",
): SessionNoteBlock {
  return {
    id: createSessionNoteBlockId(),
    references: [],
    text,
    type,
  };
}

export function createSessionNoteDocumentFromPlainText(
  notes: string,
): SessionNoteDocument {
  return {
    blocks: createBlocksFromPlainText(notes),
    version: SESSION_NOTE_DOCUMENT_VERSION,
  };
}

export function deserializeSessionNoteDocument(
  value: string,
  fallbackNotes = "",
): SessionNoteDocument {
  if (!value.trim()) {
    return createSessionNoteDocumentFromPlainText(fallbackNotes);
  }

  try {
    return normalizeSessionNoteDocument(
      JSON.parse(value) as unknown,
      fallbackNotes,
    );
  } catch {
    return createSessionNoteDocumentFromPlainText(fallbackNotes);
  }
}

export function normalizeSessionNoteDocument(
  value: unknown,
  fallbackNotes = "",
): SessionNoteDocument {
  if (!isRecord(value) || value.version !== SESSION_NOTE_DOCUMENT_VERSION) {
    return createSessionNoteDocumentFromPlainText(fallbackNotes);
  }

  const normalizedBlocks = Array.isArray(value.blocks)
    ? value.blocks
        .flatMap((block, index) => normalizeSessionNoteBlock(block, index))
        .filter((block) => block.text.trim() || block.references.length > 0)
    : [];

  if (normalizedBlocks.length === 0) {
    return fallbackNotes.trim()
      ? createSessionNoteDocumentFromPlainText(fallbackNotes)
      : createEmptySessionNoteDocument();
  }

  return {
    blocks: normalizedBlocks,
    version: SESSION_NOTE_DOCUMENT_VERSION,
  };
}

export function serializeSessionNoteDocument(document: SessionNoteDocument) {
  return JSON.stringify(normalizeSessionNoteDocument(document));
}

export function noteDocumentToPlainText(document: SessionNoteDocument) {
  return normalizeSessionNoteDocument(document).blocks
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function normalizeSessionNoteBlock(
  value: unknown,
  index: number,
): SessionNoteBlock[] {
  if (!isRecord(value)) {
    return [];
  }

  const text = typeof value.text === "string" ? value.text : "";
  const type = isSessionNoteBlockType(value.type) ? value.type : "paragraph";
  const references = Array.isArray(value.references)
    ? value.references
        .flatMap((reference) => normalizeSessionNoteReference(reference, text))
        .slice(0, SESSION_NOTE_MAX_REFERENCES_PER_BLOCK)
    : [];
  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim().slice(0, 80)
      : `legacy-block-${index + 1}`;

  return [
    {
      id,
      references,
      text,
      type,
    },
  ];
}

function normalizeSessionNoteReference(
  value: unknown,
  blockText: string,
): SessionNoteReference[] {
  if (!isRecord(value) || !isSessionNoteReferenceType(value.targetType)) {
    return [];
  }

  const targetId =
    typeof value.targetId === "string" ? value.targetId.trim() : "";
  const label = typeof value.label === "string" ? value.label.trim() : targetId;
  const startOffset =
    typeof value.startOffset === "number" ? Math.floor(value.startOffset) : -1;
  const endOffset =
    typeof value.endOffset === "number" ? Math.floor(value.endOffset) : -1;

  if (
    !targetId ||
    !label ||
    startOffset < 0 ||
    endOffset <= startOffset ||
    endOffset > blockText.length
  ) {
    return [];
  }

  return [
    {
      endOffset,
      label: label.slice(0, 120),
      startOffset,
      targetId: targetId.slice(0, 160),
      targetType: value.targetType,
    },
  ];
}

function createBlocksFromPlainText(notes: string): SessionNoteBlock[] {
  const blocks = notes
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (text, index): SessionNoteBlock => ({
        id: `legacy-block-${index + 1}`,
        references: [],
        text,
        type: "paragraph",
      }),
    );

  return blocks.length > 0 ? blocks : [createSessionNoteBlock()];
}

function createSessionNoteBlockId() {
  const cryptoValue = globalThis.crypto;

  if (typeof cryptoValue?.randomUUID === "function") {
    return `block-${cryptoValue.randomUUID()}`;
  }

  return `block-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function isSessionNoteBlockType(value: unknown): value is SessionNoteBlockType {
  return sessionNoteBlockTypes.includes(value as SessionNoteBlockType);
}

function isSessionNoteReferenceType(
  value: unknown,
): value is SessionNoteReferenceType {
  return sessionNoteReferenceTypes.includes(value as SessionNoteReferenceType);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
