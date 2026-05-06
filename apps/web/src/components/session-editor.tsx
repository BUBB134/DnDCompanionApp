"use client";

import type {
  Campaign,
  CampaignEntitySummary,
  CampaignSession,
} from "@dnd/types";
import { useActionState } from "react";
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

type SessionCreateFormProps = {
  availableEntities: CampaignEntitySummary[];
  campaign: Campaign;
};

type SessionEditFormProps = {
  availableEntities: CampaignEntitySummary[];
  campaign: Campaign;
  session: CampaignSession;
};

export function SessionCreateForm({
  availableEntities,
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
        availableEntities={availableEntities}
        state={state}
      />

      <SessionSubmitButton label="Save session" pendingLabel="Saving session..." />
    </form>
  );
}

export function SessionEditForm({
  availableEntities,
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
          availableEntities={availableEntities}
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
  availableEntities,
  compact = false,
  state,
}: {
  availableEntities: CampaignEntitySummary[];
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

      <div>
        <label
          className="text-sm font-semibold text-[#17161f]"
          htmlFor={`${fieldIdPrefix}-session-notes`}
        >
          Notes
        </label>
        <textarea
          aria-describedby={
            state.fieldErrors.notes
              ? `${fieldIdPrefix}-session-notes-error`
              : undefined
          }
          aria-invalid={state.fieldErrors.notes ? true : undefined}
          className="mt-2 min-h-56 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 py-3 text-base leading-7 outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
          defaultValue={state.values.notes}
          id={`${fieldIdPrefix}-session-notes`}
          name="notes"
          rows={compact ? 8 : 12}
        />
        {state.fieldErrors.notes ? (
          <p
            className="mt-2 text-sm text-[#8b2f39]"
            id={`${fieldIdPrefix}-session-notes-error`}
          >
            {state.fieldErrors.notes}
          </p>
        ) : null}
      </div>

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
