"use client";

import type { Campaign } from "@dnd/types";
import { useActionState } from "react";
import { createCharacterAction } from "@/characters/actions";
import { createCharacterActionState } from "@/characters/manage-character";
import {
  CharacterFormFields,
  CharacterFormNotice,
  CharacterSubmitButton,
} from "@/components/character-form-fields";

type CharacterCreateFormProps = {
  campaign: Campaign;
};

export function CharacterCreateForm({ campaign }: CharacterCreateFormProps) {
  const [state, formAction] = useActionState(
    createCharacterAction,
    createCharacterActionState({
      campaignId: campaign.id,
    }),
  );

  return (
    <form action={formAction} className="grid gap-5">
      <input name="campaignId" type="hidden" value={campaign.id} />
      <input name="characterId" type="hidden" value="" />

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8b2f39]">
          Character companion
        </p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">
          Create your character
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#4b4657]">
          Start with the details that matter at the table. Guided creation can
          build on this profile without turning it into a full character sheet.
        </p>
      </div>

      <CharacterFormNotice
        error={state.formError}
        success={state.successMessage}
      />
      <CharacterFormFields campaign={campaign} state={state} />
      <CharacterSubmitButton
        label="Create character"
        pendingLabel="Creating character..."
      />
    </form>
  );
}
