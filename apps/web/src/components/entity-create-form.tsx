"use client";

import type { Campaign } from "@dnd/types";
import { entityTypes, isDungeonMaster } from "@dnd/types";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createEntityAction } from "@/entities/actions";
import { createEntityActionState } from "@/entities/manage-entity";

type EntityCreateFormProps = {
  campaign: Campaign;
};

const entityTypeLabels: Record<(typeof entityTypes)[number], string> = {
  faction: "Faction",
  item: "Item",
  location: "Location",
  npc: "NPC",
  quest: "Quest",
};

export function EntityCreateForm({ campaign }: EntityCreateFormProps) {
  const [state, formAction] = useActionState(
    createEntityAction,
    createEntityActionState({
      campaignId: campaign.id,
    }),
  );
  const formKey = `${state.values.name}\u0000${state.values.summary}\u0000${state.values.description}`;
  const canUseDmOnlyVisibility = isDungeonMaster(campaign.role);

  return (
    <form action={formAction} className="grid gap-5" key={formKey}>
      <input name="campaignId" type="hidden" value={campaign.id} />
      <input name="entityId" type="hidden" value="" />

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          Campaign wiki
        </p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">Add entity</h2>
      </div>

      <EntityFormNotice
        error={state.formError}
        success={state.successMessage}
      />

      <EntityCoreFields
        canUseDmOnlyVisibility={canUseDmOnlyVisibility}
        state={state}
      />

      <SubmitButton label="Create entity" pendingLabel="Creating entity..." />
    </form>
  );
}

export function EntityCoreFields({
  canUseDmOnlyVisibility,
  compact = false,
  state,
}: {
  canUseDmOnlyVisibility: boolean;
  compact?: boolean;
  state: ReturnType<typeof createEntityActionState>;
}) {
  return (
    <div className={compact ? "grid gap-4" : "grid gap-5"}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-[#17161f]" htmlFor={`${state.values.entityId || "new"}-entity-name`}>
            Name
          </label>
          <input
            aria-describedby={state.fieldErrors.name ? `${state.values.entityId || "new"}-entity-name-error` : undefined}
            aria-invalid={state.fieldErrors.name ? true : undefined}
            className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
            defaultValue={state.values.name}
            id={`${state.values.entityId || "new"}-entity-name`}
            name="name"
            required
            type="text"
          />
          {state.fieldErrors.name ? (
            <p className="mt-2 text-sm text-[#8b2f39]" id={`${state.values.entityId || "new"}-entity-name-error`}>
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-semibold text-[#17161f]" htmlFor={`${state.values.entityId || "new"}-entity-type`}>
            Type
          </label>
          <select
            aria-describedby={state.fieldErrors.type ? `${state.values.entityId || "new"}-entity-type-error` : undefined}
            aria-invalid={state.fieldErrors.type ? true : undefined}
            className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
            defaultValue={state.values.type}
            id={`${state.values.entityId || "new"}-entity-type`}
            name="type"
          >
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {entityTypeLabels[type]}
              </option>
            ))}
          </select>
          {state.fieldErrors.type ? (
            <p className="mt-2 text-sm text-[#8b2f39]" id={`${state.values.entityId || "new"}-entity-type-error`}>
              {state.fieldErrors.type}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-[#17161f]" htmlFor={`${state.values.entityId || "new"}-entity-summary`}>
          Summary
        </label>
        <textarea
          aria-describedby={state.fieldErrors.summary ? `${state.values.entityId || "new"}-entity-summary-error` : undefined}
          aria-invalid={state.fieldErrors.summary ? true : undefined}
          className="mt-2 min-h-24 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 py-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
          defaultValue={state.values.summary}
          id={`${state.values.entityId || "new"}-entity-summary`}
          name="summary"
          rows={3}
        />
        {state.fieldErrors.summary ? (
          <p className="mt-2 text-sm text-[#8b2f39]" id={`${state.values.entityId || "new"}-entity-summary-error`}>
            {state.fieldErrors.summary}
          </p>
        ) : null}
      </div>

      <div>
        <label className="text-sm font-semibold text-[#17161f]" htmlFor={`${state.values.entityId || "new"}-entity-description`}>
          Description
        </label>
        <textarea
          aria-describedby={state.fieldErrors.description ? `${state.values.entityId || "new"}-entity-description-error` : undefined}
          aria-invalid={state.fieldErrors.description ? true : undefined}
          className="mt-2 min-h-32 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 py-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
          defaultValue={state.values.description}
          id={`${state.values.entityId || "new"}-entity-description`}
          name="description"
          rows={5}
        />
        {state.fieldErrors.description ? (
          <p className="mt-2 text-sm text-[#8b2f39]" id={`${state.values.entityId || "new"}-entity-description-error`}>
            {state.fieldErrors.description}
          </p>
        ) : null}
      </div>

      {canUseDmOnlyVisibility ? (
        <div>
          <label className="text-sm font-semibold text-[#17161f]" htmlFor={`${state.values.entityId || "new"}-entity-visibility`}>
            Visibility
          </label>
          <select
            aria-describedby={state.fieldErrors.visibility ? `${state.values.entityId || "new"}-entity-visibility-error` : undefined}
            aria-invalid={state.fieldErrors.visibility ? true : undefined}
            className="mt-2 min-h-11 w-full rounded-md border border-[#17161f]/15 bg-[#fffaf0] px-3 text-base outline-none transition focus:border-[#1f6f78] focus:ring-2 focus:ring-[#1f6f78]/25"
            defaultValue={state.values.visibility}
            id={`${state.values.entityId || "new"}-entity-visibility`}
            name="visibility"
          >
            <option value="player-safe">Player safe</option>
            <option value="dm-only">DM only</option>
          </select>
          {state.fieldErrors.visibility ? (
            <p className="mt-2 text-sm text-[#8b2f39]" id={`${state.values.entityId || "new"}-entity-visibility-error`}>
              {state.fieldErrors.visibility}
            </p>
          ) : null}
        </div>
      ) : (
        <input name="visibility" type="hidden" value="player-safe" />
      )}
    </div>
  );
}

export function EntityFormNotice({
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

export function SubmitButton({
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
