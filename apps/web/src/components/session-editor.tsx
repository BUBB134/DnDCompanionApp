"use client";

import type {
  Campaign,
  CampaignCharacterSummary,
  CampaignEntitySummary,
  CampaignSession,
  RuleSnippet,
  SessionNoteBlock,
  SessionNoteBlockType,
} from "@dnd/types";
import { sessionNoteBlockTypes } from "@dnd/types";
import type { KeyboardEvent } from "react";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import {
  createSessionAction,
  updateSessionAction,
} from "@/sessions/actions";
import {
  createSessionActionState,
  sessionToFormValues,
  type SessionActionState,
} from "@/sessions/manage-session";
import {
  createSessionNoteBlock,
  deserializeSessionNoteDocument,
  noteDocumentToPlainText,
  serializeSessionNoteDocument,
  sessionNoteBlockTypeLabels,
} from "@/sessions/note-document";
import {
  createSessionNoteDraftKey,
  deserializeSessionNoteDraft,
  serializeSessionNoteDraft,
  type SessionNoteDraft,
} from "@/sessions/note-draft";
import {
  createSessionNoteSuggestions,
  getActiveWikiLinkTrigger,
  type ActiveWikiLinkTrigger,
  type SessionNoteSuggestion,
} from "@/sessions/inline-suggestions";
import { createWikiLinkSummaryItems } from "@/sessions/wiki-links";

type SessionCreateFormProps = {
  availableCharacters: CampaignCharacterSummary[];
  availableEntities: CampaignEntitySummary[];
  availableRules: RuleSnippet[];
  campaign: Campaign;
  userId: string;
};

type SessionEditFormProps = {
  availableCharacters: CampaignCharacterSummary[];
  availableEntities: CampaignEntitySummary[];
  availableRules: RuleSnippet[];
  campaign: Campaign;
  session: CampaignSession;
  userId: string;
};

type ActiveSuggestionState = {
  blockId: string;
  cursorOffset: number;
  selectedIndex: number;
};

export function SessionCreateForm({
  availableCharacters,
  availableEntities,
  availableRules,
  campaign,
  userId,
}: SessionCreateFormProps) {
  const [state, formAction] = useActionState(
    createSessionAction,
    createSessionActionState({
      campaignId: campaign.id,
    }),
  );
  const formKey = `session-create-${state.savedSessionId ?? "draft"}`;

  return (
    <form action={formAction} className="grid gap-5" key={formKey}>
      <input name="campaignId" type="hidden" value={campaign.id} />
      <input name="sessionId" type="hidden" value="" />

      <SessionFormContent
        availableCharacters={availableCharacters}
        availableEntities={availableEntities}
        availableRules={availableRules}
        baseRevision="new"
        heading="Log session"
        key={createSessionFormStateKey(state)}
        label="Save session"
        pendingLabel="Saving session..."
        state={state}
        userId={userId}
      />
    </form>
  );
}

export function SessionEditForm({
  availableCharacters,
  availableEntities,
  availableRules,
  campaign,
  session,
  userId,
}: SessionEditFormProps) {
  const [state, formAction] = useActionState(
    updateSessionAction,
    createSessionActionState(sessionToFormValues(campaign.id, session)),
  );

  return (
    <details className="mt-4 rounded-lg border border-[#17161f]/10 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[#17161f]">
        Edit session
      </summary>
      <form action={formAction} className="mt-4 grid gap-4">
        <input name="campaignId" type="hidden" value={campaign.id} />
        <input name="sessionId" type="hidden" value={session.id} />

        <SessionFormContent
          availableCharacters={availableCharacters}
          availableEntities={availableEntities}
          availableRules={availableRules}
          baseRevision={state.savedSessionRevision ?? session.updatedAt}
          compact
          key={createSessionFormStateKey(state)}
          label="Save changes"
          pendingLabel="Saving changes..."
          state={state}
          userId={userId}
        />
      </form>
    </details>
  );
}

function SessionFormContent({
  availableCharacters,
  availableEntities,
  availableRules,
  baseRevision,
  compact = false,
  heading,
  label,
  pendingLabel,
  state,
  userId,
}: {
  availableCharacters: CampaignCharacterSummary[];
  availableEntities: CampaignEntitySummary[];
  availableRules: RuleSnippet[];
  baseRevision: string;
  compact?: boolean;
  heading?: string;
  label: string;
  pendingLabel: string;
  state: SessionActionState;
  userId: string;
}) {
  const { pending } = useFormStatus();
  const [hasDraftConflict, setHasDraftConflict] = useState(false);
  const [hasFieldChanges, setHasFieldChanges] = useState(false);
  const [hasNoteChanges, setHasNoteChanges] = useState(false);
  const updateNoteDirtyState = useCallback(
    (hasChanges: boolean) => setHasNoteChanges(hasChanges),
    [],
  );
  const hasErrors =
    Boolean(state.formError) || Object.keys(state.fieldErrors).length > 0;

  return (
    <div
      className={compact ? "grid gap-4" : "grid gap-5"}
      onChangeCapture={(event) => {
        const target = event.target;

        if (
          target instanceof Element &&
          target.closest("[data-session-note-editor]")
        ) {
          return;
        }

        setHasFieldChanges(true);
      }}
    >
      {heading ? (
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
            Session notes
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight">
            {heading}
          </h2>
        </div>
      ) : null}

      <SessionFormNotice error={state.formError} />

      <fieldset className="contents" disabled={pending}>
        <legend className="sr-only">Session details</legend>
        <SessionCoreFields
          availableCharacters={availableCharacters}
          availableEntities={availableEntities}
          availableRules={availableRules}
          baseRevision={baseRevision}
          compact={compact}
          onDraftConflictChange={setHasDraftConflict}
          onNoteDirtyChange={updateNoteDirtyState}
          preserveDraft={hasErrors}
          state={state}
          userId={userId}
        />
      </fieldset>

      <SessionSaveControls
        blocked={hasDraftConflict}
        hasErrors={hasErrors}
        hasUnsavedChanges={hasFieldChanges || hasNoteChanges}
        label={label}
        pendingLabel={pendingLabel}
        saved={Boolean(state.successMessage)}
      />
    </div>
  );
}

function SessionCoreFields({
  availableCharacters,
  availableEntities,
  availableRules,
  baseRevision,
  compact = false,
  onDraftConflictChange,
  onNoteDirtyChange,
  preserveDraft,
  state,
  userId,
}: {
  availableCharacters: CampaignCharacterSummary[];
  availableEntities: CampaignEntitySummary[];
  availableRules: RuleSnippet[];
  baseRevision: string;
  compact?: boolean;
  onDraftConflictChange: (hasConflict: boolean) => void;
  onNoteDirtyChange: (hasChanges: boolean) => void;
  preserveDraft: boolean;
  state: SessionActionState;
  userId: string;
}) {
  const fieldIdPrefix = state.values.sessionId || "new";
  const selectedEntityIds = new Set(state.values.taggedEntityIds);

  return (
    <div className={compact ? "grid gap-4" : "grid gap-5"}>
      <div>
        <label
          className="text-sm font-semibold text-[#17161f]"
          htmlFor={`${fieldIdPrefix}-session-title`}
        >
          Title
        </label>
        <input
          aria-describedby={
            state.fieldErrors.title
              ? `${fieldIdPrefix}-session-title-error`
              : undefined
          }
          aria-invalid={state.fieldErrors.title ? true : undefined}
          className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
          defaultValue={state.values.title}
          id={`${fieldIdPrefix}-session-title`}
          name="title"
          required
          type="text"
        />
        {state.fieldErrors.title ? (
          <p
            className="mt-2 text-sm text-[#8b2f39]"
            id={`${fieldIdPrefix}-session-title-error`}
          >
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-[#17161f]">
          Tagged entities
        </legend>
        {availableEntities.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-[#17161f]/20 bg-white px-4 py-3 text-sm leading-6 text-[#4b4657]">
            No visible entities yet.
          </div>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {availableEntities.map((entity) => (
              <label
                className="flex min-h-16 gap-3 rounded-lg border border-[#17161f]/10 bg-white px-3 py-3 text-sm transition hover:border-[#1f6f78]/45"
                key={`${fieldIdPrefix}-tag-${entity.id}`}
              >
                <input
                  className="mt-1 h-4 w-4 rounded border-[#17161f]/25 text-[#1f6f78] focus:ring-[#1f6f78]"
                  defaultChecked={selectedEntityIds.has(entity.id)}
                  name="taggedEntityIds"
                  type="checkbox"
                  value={entity.id}
                />
                <span>
                  <span className="block font-semibold text-[#17161f]">
                    {entity.name}
                  </span>
                  <span className="mt-1 block text-xs uppercase tracking-wide text-[#4b4657]">
                    {formatEntityType(entity.type)} -{" "}
                    {formatVisibility(entity.visibility)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        {state.fieldErrors.taggedEntityIds ? (
          <p
            className="mt-2 text-sm text-[#8b2f39]"
            id={`${fieldIdPrefix}-session-tags-error`}
          >
            {state.fieldErrors.taggedEntityIds}
          </p>
        ) : null}
      </fieldset>

      <SessionNoteBlockEditor
        availableCharacters={availableCharacters}
        availableEntities={availableEntities}
        availableRules={availableRules}
        baseRevision={baseRevision}
        compact={compact}
        fieldIdPrefix={fieldIdPrefix}
        key={`${fieldIdPrefix}-${state.values.notesDocument}`}
        onDraftConflictChange={onDraftConflictChange}
        onDirtyChange={onNoteDirtyChange}
        preserveDraft={preserveDraft}
        state={state}
        userId={userId}
      />

      <div>
        <label
          className="text-sm font-semibold text-[#17161f]"
          htmlFor={`${fieldIdPrefix}-session-hooks`}
        >
          Unresolved hooks
        </label>
        <textarea
          aria-describedby={
            state.fieldErrors.unresolvedHooks
              ? `${fieldIdPrefix}-session-hooks-error`
              : undefined
          }
          aria-invalid={state.fieldErrors.unresolvedHooks ? true : undefined}
          className="mt-2 min-h-28 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 py-3 text-base leading-7 outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
          defaultValue={state.values.unresolvedHooks}
          id={`${fieldIdPrefix}-session-hooks`}
          name="unresolvedHooks"
          rows={4}
        />
        {state.fieldErrors.unresolvedHooks ? (
          <p
            className="mt-2 text-sm text-[#8b2f39]"
            id={`${fieldIdPrefix}-session-hooks-error`}
          >
            {state.fieldErrors.unresolvedHooks}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SessionNoteBlockEditor({
  availableCharacters,
  availableEntities,
  availableRules,
  baseRevision,
  compact,
  fieldIdPrefix,
  onDraftConflictChange,
  onDirtyChange,
  preserveDraft,
  state,
  userId,
}: {
  availableCharacters: CampaignCharacterSummary[];
  availableEntities: CampaignEntitySummary[];
  availableRules: RuleSnippet[];
  baseRevision: string;
  compact: boolean;
  fieldIdPrefix: string;
  onDraftConflictChange: (hasConflict: boolean) => void;
  onDirtyChange: (hasChanges: boolean) => void;
  preserveDraft: boolean;
  state: SessionActionState;
  userId: string;
}) {
  const initialDocument = useMemo(
    () =>
      deserializeSessionNoteDocument(
        state.values.notesDocument,
        state.values.notes,
      ),
    [state.values.notes, state.values.notesDocument],
  );
  const initialSerializedDocument = useMemo(
    () => serializeSessionNoteDocument(initialDocument),
    [initialDocument],
  );
  const draftKey = useMemo(
    () =>
      createSessionNoteDraftKey(
        userId,
        state.values.campaignId,
        state.values.sessionId,
      ),
    [state.values.campaignId, state.values.sessionId, userId],
  );
  const [document, setDocument] = useState(() =>
    deserializeSessionNoteDocument(
      state.values.notesDocument,
      state.values.notes,
    ),
  );
  const [draftReady, setDraftReady] = useState(false);
  const [draftBaseRevision, setDraftBaseRevision] = useState(baseRevision);
  const [recoveredDraftAt, setRecoveredDraftAt] = useState<string | null>(null);
  const [staleDraft, setStaleDraft] = useState<SessionNoteDraft | null>(null);
  const [activeSuggestion, setActiveSuggestion] =
    useState<ActiveSuggestionState | null>(null);
  const pendingCursorRef = useRef<{
    blockId: string;
    cursorOffset: number;
  } | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const notesError =
    state.fieldErrors.notesDocument ?? state.fieldErrors.notes ?? null;
  const activeBlock = activeSuggestion
    ? (document.blocks.find((block) => block.id === activeSuggestion.blockId) ??
      null)
    : null;
  const activeTrigger = activeBlock
    ? getActiveWikiLinkTrigger(activeBlock.text, activeSuggestion?.cursorOffset ?? 0)
    : null;

  const serializedDocument = useMemo(
    () => serializeSessionNoteDocument(document),
    [document],
  );
  const plainTextNotes = useMemo(
    () => noteDocumentToPlainText(document),
    [document],
  );
  const wikiLinkItems = useMemo(
    () =>
      createWikiLinkSummaryItems(document, {
        characters: availableCharacters,
        entities: availableEntities,
        rules: availableRules,
      }),
    [availableCharacters, availableEntities, availableRules, document],
  );
  const activeSuggestions = useMemo(
    () =>
      activeTrigger
        ? createSessionNoteSuggestions(activeTrigger, {
            characters: availableCharacters,
            document,
            entities: availableEntities,
            rules: availableRules,
          })
        : [],
    [
      activeTrigger,
      availableCharacters,
      availableEntities,
      availableRules,
      document,
    ],
  );
  const selectedSuggestionIndex =
    activeSuggestions.length > 0 && activeSuggestion
      ? Math.min(activeSuggestion.selectedIndex, activeSuggestions.length - 1)
      : -1;
  const shouldPersistDraft =
    preserveDraft || serializedDocument !== initialSerializedDocument;
  const hasLocalDraft = draftReady && !staleDraft && shouldPersistDraft;
  const draftSnapshotRef = useRef({
    baseRevision: draftBaseRevision,
    document,
    shouldPersist: shouldPersistDraft,
  });

  useEffect(() => {
    draftSnapshotRef.current = {
      baseRevision: draftBaseRevision,
      document,
      shouldPersist: shouldPersistDraft,
    };
  }, [document, draftBaseRevision, shouldPersistDraft]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        if (state.successMessage) {
          window.sessionStorage.removeItem(draftKey);
          return;
        }

        const draft = deserializeSessionNoteDraft(
          window.sessionStorage.getItem(draftKey),
        );

        if (draft) {
          if (draft.baseRevision !== baseRevision) {
            setStaleDraft(draft);
            onDraftConflictChange(true);
          } else if (
            serializeSessionNoteDocument(draft.document) !==
            initialSerializedDocument
          ) {
            setDocument(draft.document);
            setDraftBaseRevision(draft.baseRevision);
            setRecoveredDraftAt(draft.savedAt);
            onDirtyChange(true);
          }
        }
      } catch {
        // Session storage can be unavailable in hardened or private browsers.
      } finally {
        setDraftReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    baseRevision,
    draftKey,
    initialSerializedDocument,
    onDraftConflictChange,
    onDirtyChange,
    state.successMessage,
  ]);

  useEffect(() => {
    if (!draftReady || staleDraft) {
      return;
    }

    const persistDraft = () => {
      const snapshot = draftSnapshotRef.current;

      try {
        if (snapshot.shouldPersist) {
          window.sessionStorage.setItem(
            draftKey,
            serializeSessionNoteDraft(
              snapshot.document,
              snapshot.baseRevision,
            ),
          );
        } else {
          window.sessionStorage.removeItem(draftKey);
        }
      } catch {
        // The server save remains available when local draft storage fails.
      }
    };

    const timeout = window.setTimeout(() => {
      persistDraft();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [
    draftKey,
    draftReady,
    shouldPersistDraft,
    staleDraft,
  ]);

  useEffect(() => {
    if (!draftReady || staleDraft) {
      return;
    }

    const persistDraft = () => {
      const snapshot = draftSnapshotRef.current;

      try {
        if (snapshot.shouldPersist) {
          window.sessionStorage.setItem(
            draftKey,
            serializeSessionNoteDraft(
              snapshot.document,
              snapshot.baseRevision,
            ),
          );
        } else {
          window.sessionStorage.removeItem(draftKey);
        }
      } catch {
        // Page navigation must continue even if browser storage is unavailable.
      }
    };

    window.addEventListener("pagehide", persistDraft);

    return () => window.removeEventListener("pagehide", persistDraft);
  }, [draftKey, draftReady, staleDraft]);

  useEffect(() => {
    const pendingCursor = pendingCursorRef.current;

    if (!pendingCursor) {
      return;
    }

    pendingCursorRef.current = null;

    const textarea = textareaRefs.current[pendingCursor.blockId];

    if (!textarea) {
      return;
    }

    textarea.focus();
    textarea.setSelectionRange(
      pendingCursor.cursorOffset,
      pendingCursor.cursorOffset,
    );
  }, [document]);

  function updateBlock(
    blockId: string,
    update: Partial<Pick<SessionNoteBlock, "text" | "type">>,
  ) {
    onDirtyChange(true);
    setDocument((currentDocument) => ({
      ...currentDocument,
      blocks: currentDocument.blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...update,
              references:
                update.text === undefined ? block.references : [],
            }
          : block,
      ),
    }));
  }

  function updateActiveSuggestion(
    blockId: string,
    text: string,
    cursorOffset: number | null,
  ) {
    const trigger =
      cursorOffset === null
        ? null
        : getActiveWikiLinkTrigger(text, cursorOffset);

    setActiveSuggestion(
      trigger
        ? {
            blockId,
            cursorOffset: trigger.cursorOffset,
            selectedIndex: 0,
          }
        : null,
    );
  }

  function selectActiveSuggestion(suggestion: SessionNoteSuggestion) {
    if (!activeBlock || !activeTrigger) {
      return;
    }

    applySuggestion(activeBlock, activeTrigger, suggestion);
  }

  function applySuggestion(
    block: SessionNoteBlock,
    trigger: ActiveWikiLinkTrigger,
    suggestion: SessionNoteSuggestion,
  ) {
    const nextText = `${block.text.slice(0, trigger.startOffset)}${
      suggestion.replacement
    }${block.text.slice(trigger.cursorOffset)}`;
    const cursorOffset = trigger.startOffset + suggestion.replacement.length;

    pendingCursorRef.current = {
      blockId: block.id,
      cursorOffset,
    };
    setActiveSuggestion(null);
    updateBlock(block.id, { text: nextText });
  }

  function handleBlockKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    block: SessionNoteBlock,
  ) {
    if (activeSuggestion?.blockId !== block.id || activeSuggestions.length === 0) {
      return;
    }

    if (isComposingText(event)) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion({
        ...activeSuggestion,
        selectedIndex:
          (selectedSuggestionIndex + 1) % activeSuggestions.length,
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion({
        ...activeSuggestion,
        selectedIndex:
          (selectedSuggestionIndex - 1 + activeSuggestions.length) %
          activeSuggestions.length,
      });
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setActiveSuggestion(null);
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const suggestion = activeSuggestions[selectedSuggestionIndex];

      if (suggestion) {
        selectActiveSuggestion(suggestion);
      }
    }
  }

  function addBlock(afterIndex: number) {
    onDirtyChange(true);
    setDocument((currentDocument) => {
      const nextBlocks = [...currentDocument.blocks];

      nextBlocks.splice(afterIndex + 1, 0, createSessionNoteBlock());

      return {
        ...currentDocument,
        blocks: nextBlocks,
      };
    });
  }

  function moveBlock(fromIndex: number, direction: -1 | 1) {
    onDirtyChange(true);
    setDocument((currentDocument) => {
      const toIndex = fromIndex + direction;

      if (toIndex < 0 || toIndex >= currentDocument.blocks.length) {
        return currentDocument;
      }

      const nextBlocks = [...currentDocument.blocks];
      const [block] = nextBlocks.splice(fromIndex, 1);

      if (!block) {
        return currentDocument;
      }

      nextBlocks.splice(toIndex, 0, block);

      return {
        ...currentDocument,
        blocks: nextBlocks,
      };
    });
  }

  function removeBlock(blockId: string) {
    onDirtyChange(true);
    setDocument((currentDocument) => {
      const nextBlocks = currentDocument.blocks.filter(
        (block) => block.id !== blockId,
      );

      return {
        ...currentDocument,
        blocks: nextBlocks.length > 0 ? nextBlocks : [createSessionNoteBlock()],
      };
    });
  }

  function discardRecoveredDraft() {
    try {
      window.sessionStorage.removeItem(draftKey);
    } catch {
      // Reset the editor even when browser storage is unavailable.
    }

    setDocument(initialDocument);
    setDraftBaseRevision(baseRevision);
    setRecoveredDraftAt(null);
    setActiveSuggestion(null);
    onDirtyChange(false);
  }

  function restoreStaleDraft() {
    if (!staleDraft) {
      return;
    }

    setDocument(staleDraft.document);
    setDraftBaseRevision(staleDraft.baseRevision);
    setRecoveredDraftAt(staleDraft.savedAt);
    setStaleDraft(null);
    onDraftConflictChange(false);
    onDirtyChange(true);
  }

  function discardStaleDraft() {
    try {
      window.sessionStorage.removeItem(draftKey);
    } catch {
      // Keep the server-backed editor available when browser storage fails.
    }

    setStaleDraft(null);
    onDraftConflictChange(false);
  }

  return (
    <div data-session-note-editor>
      <label
        className="text-sm font-semibold text-[#17161f]"
        htmlFor={`${fieldIdPrefix}-session-notes-block-0`}
      >
        Notes
      </label>
      <p
        className="mt-1 text-sm leading-6 text-[#4b4657]"
        id={`${fieldIdPrefix}-session-notes-hint`}
      >
        Capture short beats as play moves. Type{" "}
        <span className="font-semibold text-[#17161f]">[[</span> to link a
        campaign entity, rule, or character without leaving the editor.
      </p>
      <input name="notes" type="hidden" value={plainTextNotes} />
      <input name="notesDocument" type="hidden" value={serializedDocument} />
      {!draftReady ? (
        <div
          className="mt-3 rounded-lg border border-[#17161f]/10 bg-white px-3 py-3 text-sm text-[#4b4657]"
          role="status"
        >
          Checking this tab for unsaved notes...
        </div>
      ) : null}
      {draftReady && staleDraft ? (
        <div className="mt-3 rounded-lg border border-[#8b2f39]/25 bg-[#f9e8ea] px-3 py-3 text-sm text-[#6f2430]">
          <p className="font-semibold">An older unsaved draft is available.</p>
          <p className="mt-1 leading-6">
            The saved session changed after this draft was created. Review the
            older notes explicitly or keep the latest saved version.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="min-h-11 rounded-md bg-[#17161f] px-3 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
              onClick={restoreStaleDraft}
              type="button"
            >
              Restore older draft
            </button>
            <button
              className="min-h-11 rounded-md border border-[#8b2f39]/25 bg-white px-3 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2"
              onClick={discardStaleDraft}
              type="button"
            >
              Keep latest saved notes
            </button>
          </div>
        </div>
      ) : null}
      {hasLocalDraft ? (
        <div
          className="mt-3 flex flex-col gap-2 rounded-lg border border-[#c3943e]/40 bg-[#fffaf0] px-3 py-3 text-sm text-[#5c4212] sm:flex-row sm:items-center sm:justify-between"
        >
          <span role="status">
            {recoveredDraftAt
              ? "Recovered unsaved notes from this tab. Save when ready."
              : "Unsaved notes are backed up temporarily in this tab."}
          </span>
          {recoveredDraftAt ? (
            <button
              className="min-h-11 rounded-md border border-[#c3943e]/45 bg-white px-3 font-semibold transition hover:bg-[#fff4d9] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 sm:min-h-9"
              onClick={discardRecoveredDraft}
              type="button"
            >
              Discard recovered draft
            </button>
          ) : null}
        </div>
      ) : null}
      {draftReady && !staleDraft ? (
        <div className="mt-2 grid gap-3">
        {document.blocks.map((block, index) => {
          const isSuggestingForBlock =
            activeSuggestion?.blockId === block.id &&
            activeTrigger !== null &&
            activeSuggestions.length > 0;
          const suggestionListId =
            `${fieldIdPrefix}-session-notes-suggestions-${block.id}`;

          return (
            <div
              className="rounded-lg border border-[#17161f]/10 bg-white p-3"
              key={block.id}
              onBlur={(event) => {
                const nextTarget = event.relatedTarget;

                if (
                  !(nextTarget instanceof Node) ||
                  !event.currentTarget.contains(nextTarget)
                ) {
                  setActiveSuggestion(null);
                }
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className="sr-only"
                  htmlFor={`${fieldIdPrefix}-session-block-type-${block.id}`}
                >
                  Block type
                </label>
                <select
                  className="min-h-9 rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-2 text-sm font-semibold outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
                  id={`${fieldIdPrefix}-session-block-type-${block.id}`}
                  onChange={(event) =>
                    updateBlock(block.id, {
                      type: event.target.value as SessionNoteBlockType,
                    })
                  }
                  value={block.type}
                >
                  {sessionNoteBlockTypes.map((type) => (
                    <option key={type} value={type}>
                      {sessionNoteBlockTypeLabels[type]}
                    </option>
                  ))}
                </select>
                <div className="ml-auto flex flex-wrap gap-2">
                  <BlockEditorButton
                    disabled={index === 0}
                    label="Up"
                    onClick={() => moveBlock(index, -1)}
                  />
                  <BlockEditorButton
                    disabled={index === document.blocks.length - 1}
                    label="Down"
                    onClick={() => moveBlock(index, 1)}
                  />
                  <BlockEditorButton
                    label="Add"
                    onClick={() => addBlock(index)}
                  />
                  <BlockEditorButton
                    disabled={
                      document.blocks.length === 1 && block.text.length === 0
                    }
                    label="Remove"
                    onClick={() => removeBlock(block.id)}
                  />
                </div>
              </div>
              <label
                className="sr-only"
                htmlFor={`${fieldIdPrefix}-session-notes-block-${index}`}
              >
                Note block {index + 1}
              </label>
              <textarea
                aria-activedescendant={
                  isSuggestingForBlock
                    ? `${suggestionListId}-${selectedSuggestionIndex}`
                    : undefined
                }
                aria-autocomplete="list"
                aria-controls={isSuggestingForBlock ? suggestionListId : undefined}
                aria-describedby={[
                  `${fieldIdPrefix}-session-notes-hint`,
                  notesError
                    ? `${fieldIdPrefix}-session-notes-error`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-invalid={notesError ? true : undefined}
                className="mt-3 min-h-36 w-full resize-y rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 py-3 text-base leading-7 outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
                id={`${fieldIdPrefix}-session-notes-block-${index}`}
                onChange={(event) => {
                  updateBlock(block.id, { text: event.target.value });
                  updateActiveSuggestion(
                    block.id,
                    event.target.value,
                    event.target.selectionStart,
                  );
                }}
                onClick={(event) =>
                  updateActiveSuggestion(
                    block.id,
                    event.currentTarget.value,
                    event.currentTarget.selectionStart,
                  )
                }
                onFocus={(event) =>
                  updateActiveSuggestion(
                    block.id,
                    event.currentTarget.value,
                    event.currentTarget.selectionStart,
                  )
                }
                onKeyDown={(event) => handleBlockKeyDown(event, block)}
                onKeyUp={(event) => {
                  if (event.key === "Escape") {
                    return;
                  }

                  if (
                    activeSuggestion?.blockId === block.id &&
                    [
                      "ArrowDown",
                      "ArrowUp",
                      "Enter",
                      "Escape",
                      "Tab",
                    ].includes(event.key)
                  ) {
                    return;
                  }

                  updateActiveSuggestion(
                    block.id,
                    event.currentTarget.value,
                    event.currentTarget.selectionStart,
                  );
                }}
                ref={(element) => {
                  textareaRefs.current[block.id] = element;
                }}
                placeholder={
                  index === 0
                    ? "What changed at the table? Decisions, discoveries, NPCs, and open questions all belong here."
                    : "Continue the session notes..."
                }
                rows={compact ? 4 : 5}
                value={block.text}
              />
              {isSuggestingForBlock ? (
                <SessionNoteSuggestionList
                  id={suggestionListId}
                  onSelect={selectActiveSuggestion}
                  selectedIndex={selectedSuggestionIndex}
                  suggestions={activeSuggestions}
                />
              ) : null}
            </div>
          );
        })}
        </div>
      ) : null}
      {draftReady && !staleDraft && wikiLinkItems.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[#1f6f78]/20 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f6f78]">
            Wiki links
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {wikiLinkItems.map((item) => (
              <span
                className={getWikiLinkItemClassName(item.tone)}
                key={`${item.typeLabel}-${item.label}-${item.tone}`}
              >
                {item.typeLabel}: {item.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {notesError ? (
        <p
          className="mt-2 text-sm text-[#8b2f39]"
          id={`${fieldIdPrefix}-session-notes-error`}
        >
          {notesError}
        </p>
      ) : null}
    </div>
  );
}

function isComposingText(event: KeyboardEvent<HTMLTextAreaElement>) {
  return event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;
}

function getWikiLinkItemClassName(itemTone: "create" | "missing" | "resolved") {
  const baseClassName =
    "rounded-full border px-2.5 py-1 text-xs font-semibold";

  if (itemTone === "resolved") {
    return `${baseClassName} border-[#1f6f78]/25 bg-[#e7f5f6] text-[#164f56]`;
  }

  if (itemTone === "create") {
    return `${baseClassName} border-[#c3943e]/40 bg-[#fffaf0] text-[#5c4212]`;
  }

  return `${baseClassName} border-[#8b2f39]/25 bg-[#f9e8ea] text-[#6f2430]`;
}

function SessionNoteSuggestionList({
  id,
  onSelect,
  selectedIndex,
  suggestions,
}: {
  id: string;
  onSelect: (suggestion: SessionNoteSuggestion) => void;
  selectedIndex: number;
  suggestions: SessionNoteSuggestion[];
}) {
  return (
    <div
      className="mt-2 overflow-hidden rounded-lg border border-[#1f6f78]/25 bg-white shadow-sm"
      id={id}
      role="listbox"
    >
      {suggestions.map((suggestion, index) => (
        <button
          aria-selected={index === selectedIndex}
          className={getSuggestionButtonClassName(index === selectedIndex)}
          id={`${id}-${index}`}
          key={suggestion.id}
          onClick={() => onSelect(suggestion)}
          onMouseDown={(event) => event.preventDefault()}
          role="option"
          type="button"
        >
          <span className="min-w-0">
            <span className="block truncate font-semibold text-[#17161f]">
              {suggestion.label}
            </span>
            <span className="mt-0.5 block truncate text-xs text-[#4b4657]">
              {suggestion.detail}
            </span>
          </span>
          <span className={getSuggestionTypeClassName(suggestion.kind)}>
            {suggestion.typeLabel}
          </span>
        </button>
      ))}
    </div>
  );
}

function getSuggestionButtonClassName(isSelected: boolean) {
  const baseClassName =
    "flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm outline-none transition";

  return isSelected
    ? `${baseClassName} bg-[#e7f5f6]`
    : `${baseClassName} bg-white hover:bg-[#fffaf0] focus:bg-[#e7f5f6]`;
}

function getSuggestionTypeClassName(kind: SessionNoteSuggestion["kind"]) {
  const baseClassName =
    "ml-auto shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold";

  if (kind === "rule") {
    return `${baseClassName} border-[#1f6f78]/25 bg-[#e7f5f6] text-[#164f56]`;
  }

  if (kind === "create-entity") {
    return `${baseClassName} border-[#c3943e]/40 bg-[#fffaf0] text-[#5c4212]`;
  }

  if (kind === "character") {
    return `${baseClassName} border-[#17161f]/15 bg-[#f4f2ec] text-[#2d2937]`;
  }

  return `${baseClassName} border-[#8b2f39]/20 bg-[#f9e8ea] text-[#6f2430]`;
}

function BlockEditorButton({
  disabled = false,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="min-h-11 rounded-md border border-[#17161f]/10 bg-[#fffaf0] px-3 text-xs font-semibold text-[#17161f] transition hover:border-[#1f6f78]/45 hover:bg-[#e7f5f6] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-9"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
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

function formatVisibility(visibility: CampaignEntitySummary["visibility"]) {
  return visibility === "dm-only" ? "DM only" : "Player safe";
}

function SessionFormNotice({
  error,
}: {
  error: string | null;
}) {
  if (error) {
    return (
      <div
        className="rounded-lg border border-[#8b2f39]/25 bg-[#f9e8ea] px-4 py-3 text-sm text-[#6f2430]"
        role="alert"
      >
        <span className="font-semibold">Save failed.</span> {error} Your
        changes are still in the editor, so you can correct the issue and retry.
      </div>
    );
  }

  return null;
}

function SessionSaveControls({
  blocked,
  hasErrors,
  hasUnsavedChanges,
  label,
  pendingLabel,
  saved,
}: {
  blocked: boolean;
  hasErrors: boolean;
  hasUnsavedChanges: boolean;
  label: string;
  pendingLabel: string;
  saved: boolean;
}) {
  const { pending } = useFormStatus();
  const status = pending
    ? pendingLabel
    : blocked
      ? "Choose whether to restore or discard the older note draft."
    : hasErrors
      ? "Save failed. Your changes are still in the editor."
      : hasUnsavedChanges
        ? "Unsaved changes"
        : saved
          ? "Saved"
          : "Ready to save";
  const buttonLabel = pending
    ? pendingLabel
    : hasErrors
      ? "Retry save"
      : label;

  return (
    <div
      className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-lg border border-[#17161f]/10 bg-white/95 p-3 shadow-lg backdrop-blur sm:static sm:flex-row sm:items-center sm:justify-between sm:shadow-none"
    >
      <p aria-live="polite" className="text-sm font-semibold text-[#4b4657]">
        {status}
      </p>
      <button
        className="min-h-11 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={pending || blocked}
        type="submit"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function createSessionFormStateKey(state: SessionActionState) {
  return JSON.stringify({
    fieldErrors: state.fieldErrors,
    formError: state.formError,
    savedSessionId: state.savedSessionId,
    savedSessionRevision: state.savedSessionRevision,
    successMessage: state.successMessage,
    values: state.values,
  });
}
