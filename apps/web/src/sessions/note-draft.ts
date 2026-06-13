import type { SessionNoteDocument } from "@dnd/types";
import {
  normalizeSessionNoteDocument,
  SESSION_NOTE_DOCUMENT_VERSION,
} from "@/sessions/note-document";

const SESSION_NOTE_DRAFT_VERSION = 1;

export type SessionNoteDraft = {
  document: SessionNoteDocument;
  savedAt: string;
};

export function createSessionNoteDraftKey(
  campaignId: string,
  sessionId: string,
) {
  return [
    "dnd-session-note-draft",
    encodeURIComponent(campaignId.trim()),
    encodeURIComponent(sessionId.trim() || "new"),
  ].join(":");
}

export function serializeSessionNoteDraft(
  document: SessionNoteDocument,
  savedAt = new Date().toISOString(),
) {
  return JSON.stringify({
    document: normalizeSessionNoteDocument(document),
    savedAt,
    version: SESSION_NOTE_DRAFT_VERSION,
  });
}

export function deserializeSessionNoteDraft(
  value: string | null,
): SessionNoteDraft | null {
  if (!value) {
    return null;
  }

  try {
    const draft = JSON.parse(value) as unknown;

    if (
      !isRecord(draft) ||
      draft.version !== SESSION_NOTE_DRAFT_VERSION ||
      typeof draft.savedAt !== "string" ||
      !isRecord(draft.document) ||
      draft.document.version !== SESSION_NOTE_DOCUMENT_VERSION ||
      !Array.isArray(draft.document.blocks)
    ) {
      return null;
    }

    return {
      document: normalizeSessionNoteDocument(draft.document),
      savedAt: draft.savedAt,
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
