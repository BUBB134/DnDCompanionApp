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
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
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
};

type SessionEditFormProps = {
  availableCharacters: CampaignCharacterSummary[];
  availableEntities: CampaignEntitySummary[];
  availableRules: RuleSnippet[];
  campaign: Campaign;
  session: CampaignSession;
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

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          Session notes
        </p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">
          Log session
        </h2>
      </div>

      <SessionFormNotice
        error={state.formError}
        success={state.successMessage}
      />

      <SessionCoreFields
        availableCharacters={availableCharacters}
        availableEntities={availableEntities}
        availableRules={availableRules}
        state={state}
      />

      <SessionSubmitButton label="Save session" pendingLabel="Saving session..." />
    </form>
  );
}

export function SessionEditForm({
  availableCharacters,
  availableEntities,
  availableRules,
  campaign,
  session,
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

        <SessionFormNotice
          error={state.formError}
          success={state.successMessage}
        />

        <SessionCoreFields
          availableCharacters={availableCharacters}
          availableEntities={availableEntities}
          availableRules={availableRules}
          compact
          state={state}
        />

        <SessionSubmitButton
          label="Save changes"
          pendingLabel="Saving changes..."
        />
      </form>
    </details>
  );
}

function SessionCoreFields({
  availableCharacters,
  availableEntities,
  availableRules,
  compact = false,
  state,
}: {
  availableCharacters: CampaignCharacterSummary[];
  availableEntities: CampaignEntitySummary[];
  availableRules: RuleSnippet[];
  compact?: boolean;
  state: SessionActionState;
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
        compact={compact}
        fieldIdPrefix={fieldIdPrefix}
        key={`${fieldIdPrefix}-${state.values.notesDocument}`}
        state={state}
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
  compact,
  fieldIdPrefix,
  state,
}: {
  availableCharacters: CampaignCharacterSummary[];
  availableEntities: CampaignEntitySummary[];
  availableRules: RuleSnippet[];
  compact: boolean;
  fieldIdPrefix: string;
  state: SessionActionState;
}) {
  const [document, setDocument] = useState(() =>
    deserializeSessionNoteDocument(
      state.values.notesDocument,
      state.values.notes,
    ),
  );
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

  return (
    <div>
      <label
        className="text-sm font-semibold text-[#17161f]"
        htmlFor={`${fieldIdPrefix}-session-notes-block-0`}
      >
        Notes
      </label>
      <input name="notes" type="hidden" value={plainTextNotes} />
      <input name="notesDocument" type="hidden" value={serializedDocument} />
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
                aria-describedby={
                  notesError ? `${fieldIdPrefix}-session-notes-error` : undefined
                }
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
      {wikiLinkItems.length > 0 ? (
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
    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm outline-none transition";

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
      className="min-h-9 rounded-md border border-[#17161f]/10 bg-[#fffaf0] px-3 text-xs font-semibold text-[#17161f] transition hover:border-[#1f6f78]/45 hover:bg-[#e7f5f6] focus:outline-none focus:ring-2 focus:ring-[#1f6f78] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
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
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (error) {
    return (
      <div
        className="rounded-lg border border-[#8b2f39]/25 bg-[#f9e8ea] px-4 py-3 text-sm text-[#6f2430]"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (success) {
    return (
      <div
        className="rounded-lg border border-[#1f6f78]/25 bg-[#e7f5f6] px-4 py-3 text-sm text-[#164f56]"
        role="status"
      >
        {success}
      </div>
    );
  }

  return null;
}

function SessionSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 rounded-md bg-[#17161f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2937] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
