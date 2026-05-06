"use client";

import type { Campaign, CampaignEntity } from "@dnd/types";
import { isDungeonMaster } from "@dnd/types";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteEntityAction,
  initialDeleteEntityActionState,
  updateEntityAction,
} from "@/entities/actions";
import {
  createEntityActionState,
  entityToFormValues,
} from "@/entities/manage-entity";
import {
  EntityCoreFields,
  EntityFormNotice,
  SubmitButton,
} from "@/components/entity-create-form";

type EntityEditFormProps = {
  campaign: Campaign;
  entity: CampaignEntity;
};

export function EntityEditForm({ campaign, entity }: EntityEditFormProps) {
  const [state, formAction] = useActionState(
    updateEntityAction,
    createEntityActionState(entityToFormValues(campaign.id, entity)),
  );
  const canUseDmOnlyVisibility = isDungeonMaster(campaign.role);

  return (
    <details className="mt-4 rounded-lg border border-[#17161f]/10 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[#17161f]">
        Edit entity
      </summary>
      <form action={formAction} className="mt-4 grid gap-4">
        <input name="campaignId" type="hidden" value={campaign.id} />
        <input name="entityId" type="hidden" value={entity.id} />

        <EntityFormNotice
          error={state.formError}
          success={state.successMessage}
        />

        <EntityCoreFields
          canUseDmOnlyVisibility={canUseDmOnlyVisibility}
          compact
          state={state}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SubmitButton label="Save changes" pendingLabel="Saving changes..." />
        </div>
      </form>
    </details>
  );
}

export function EntityDeleteForm({ campaign, entity }: EntityEditFormProps) {
  const [state, formAction] = useActionState(
    deleteEntityAction,
    initialDeleteEntityActionState,
  );

  return (
    <form action={formAction} className="mt-3">
      <input name="campaignId" type="hidden" value={campaign.id} />
      <input name="entityId" type="hidden" value={entity.id} />
      <DeleteButton />
      {state.formError ? (
        <p className="mt-2 text-sm text-[#8b2f39]" role="alert">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-10 rounded-md border border-[#8b2f39]/30 bg-[#f9e8ea] px-3 py-2 text-sm font-semibold text-[#6f2430] transition hover:border-[#8b2f39] focus:outline-none focus:ring-2 focus:ring-[#8b2f39] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Deleting..." : "Delete entity"}
    </button>
  );
}
