"use server";

import { formatDatabaseError } from "@dnd/db";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { isDatabaseCampaignId, isDatabaseId } from "@/campaigns/database-id";
import {
  initialSpellbookActionState,
  parseSpellLevel,
  parseSpellPreparationState,
  parseTotalSpellSlots,
  type SpellbookActionState,
} from "@/spells/manage-spellbook";
import {
  adjustCharacterSpellSlotsForUser,
  configureCharacterSpellSlotsForUser,
  removeCharacterSpellForUser,
  setCharacterSpellForUser,
} from "@/spells/repository";

export async function updateCharacterSpellAction(
  _previousState: SpellbookActionState,
  formData: FormData,
): Promise<SpellbookActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const campaignId = getStringField(formData, "campaignId");
  const characterId = getStringField(formData, "characterId");
  const spellId = getStringField(formData, "spellId");
  const operation = getStringField(formData, "operation");
  const preparation = parseSpellPreparationState(
    getStringField(formData, "preparation"),
  );

  if (
    !isDatabaseCampaignId(campaignId) ||
    !isDatabaseId(characterId) ||
    !isDatabaseId(spellId)
  ) {
    return createErrorState("Choose a saved character and spell.");
  }

  const campaign = await getCurrentCampaignAccess(session, campaignId);

  if (!campaign) {
    return createErrorState(
      "Campaign access is required before changing a spellbook.",
    );
  }

  try {
    if (operation === "remove") {
      await removeCharacterSpellForUser(
        session.user.id,
        campaign.id,
        characterId,
        spellId,
      );
      revalidateSpellbookPaths(campaign.id, characterId);
      return createSuccessState("Spell removed from the character.");
    }

    if (!preparation) {
      return createErrorState("Choose whether this spell is known or prepared.");
    }

    await setCharacterSpellForUser(
      session.user.id,
      campaign.id,
      characterId,
      spellId,
      preparation,
    );
    revalidateSpellbookPaths(campaign.id, characterId);
    return createSuccessState(
      preparation === "prepared"
        ? "Spell marked as prepared."
        : "Spell added as known.",
    );
  } catch (error) {
    return createErrorState(formatDatabaseError(error));
  }
}

export async function updateCharacterSpellSlotAction(
  _previousState: SpellbookActionState,
  formData: FormData,
): Promise<SpellbookActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const campaignId = getStringField(formData, "campaignId");
  const characterId = getStringField(formData, "characterId");
  const operation = getStringField(formData, "operation");
  const spellLevel = parseSpellLevel(getStringField(formData, "spellLevel"));

  if (
    !isDatabaseCampaignId(campaignId) ||
    !isDatabaseId(characterId) ||
    spellLevel === null
  ) {
    return createErrorState("Choose a saved character and spell level.");
  }

  const campaign = await getCurrentCampaignAccess(session, campaignId);

  if (!campaign) {
    return createErrorState(
      "Campaign access is required before changing spell slots.",
    );
  }

  try {
    if (operation === "use" || operation === "restore") {
      await adjustCharacterSpellSlotsForUser(
        session.user.id,
        campaign.id,
        characterId,
        spellLevel,
        operation === "use" ? 1 : -1,
      );
      revalidateSpellbookPaths(campaign.id, characterId);
      return createSuccessState(
        operation === "use"
          ? `Level ${spellLevel} slot used.`
          : `Level ${spellLevel} slot restored.`,
      );
    }

    const totalSlots = parseTotalSpellSlots(
      getStringField(formData, "totalSlots"),
    );

    if (totalSlots === null) {
      return createErrorState("Set total slots to a whole number from 0 to 9.");
    }

    await configureCharacterSpellSlotsForUser(
      session.user.id,
      campaign.id,
      characterId,
      spellLevel,
      totalSlots,
    );
    revalidateSpellbookPaths(campaign.id, characterId);
    return createSuccessState(
      totalSlots === 0
        ? `Level ${spellLevel} slot pool removed.`
        : `Level ${spellLevel} slots updated.`,
    );
  } catch (error) {
    return createErrorState(formatDatabaseError(error));
  }
}

function createErrorState(formError: string): SpellbookActionState {
  return {
    ...initialSpellbookActionState,
    formError,
  };
}

function createSuccessState(successMessage: string): SpellbookActionState {
  return {
    ...initialSpellbookActionState,
    successMessage,
  };
}

function getStringField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

function revalidateSpellbookPaths(campaignId: string, characterId: string) {
  revalidatePath(`/campaigns/${campaignId}/characters`);
  revalidatePath(`/campaigns/${campaignId}/characters/${characterId}`);
  revalidatePath(
    `/campaigns/${campaignId}/characters/${characterId}/spellbook`,
  );
}
