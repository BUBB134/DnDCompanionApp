"use client";

import type { Campaign, CampaignCharacterFullView } from "@dnd/types";
import { useActionState } from "react";
import { updateCharacterAction } from "@/characters/actions";
import {
  characterToFormValues,
  createCharacterActionState,
} from "@/characters/manage-character";
import {
  CharacterFormFields,
  CharacterFormNotice,
  CharacterSubmitButton,
} from "@/components/character-form-fields";

type CharacterEditFormProps = {
  campaign: Campaign;
  character: CampaignCharacterFullView;
};

export function CharacterEditForm({
  campaign,
  character,
}: CharacterEditFormProps) {
  const [state, formAction] = useActionState(
    updateCharacterAction,
    createCharacterActionState(
      characterToFormValues(campaign.id, character),
    ),
  );

  return (
    <details className="rounded-lg border border-[#17161f]/10 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[#17161f]">
        Edit character
      </summary>
      <form action={formAction} className="mt-5 grid gap-5">
        <input name="campaignId" type="hidden" value={campaign.id} />
        <input name="characterId" type="hidden" value={character.id} />

        <CharacterFormNotice
          error={state.formError}
          success={state.successMessage}
        />
        <CharacterFormFields campaign={campaign} compact state={state} />
        <CharacterSubmitButton
          label="Save character"
          pendingLabel="Saving character..."
        />
      </form>
    </details>
  );
}
