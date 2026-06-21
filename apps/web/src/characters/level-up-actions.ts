"use server";

import { formatDatabaseError } from "@dnd/db";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import {
  isDatabaseCampaignId,
  isDatabaseId,
} from "@/campaigns/database-id";
import {
  completeLevelUpSubmission,
  createLevelUpActionState,
  type LevelUpActionState,
  type LevelUpFormValues,
} from "@/characters/manage-level-up";
import {
  completeCharacterLevelUpForUser,
  getCharacterForUser,
} from "@/characters/repository";

export async function completeCharacterLevelUpAction(
  _previousState: LevelUpActionState,
  formData: FormData,
): Promise<LevelUpActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const values = readLevelUpFormValues(formData);

  if (
    !isDatabaseCampaignId(values.campaignId) ||
    !isDatabaseId(values.characterId)
  ) {
    return {
      ...createLevelUpActionState(values),
      formError: "Open a saved character before levelling up.",
    };
  }

  const campaign = await getCurrentCampaignAccess(
    session,
    values.campaignId,
  );

  if (!campaign) {
    return {
      ...createLevelUpActionState(values),
      formError: "Campaign access is required before levelling up.",
    };
  }

  const character = await getCharacterForUser(
    session.user.id,
    campaign.id,
    values.characterId,
  );

  if (
    !character ||
    character.accessLevel !== "full" ||
    !character.canEdit
  ) {
    return {
      ...createLevelUpActionState(values),
      formError: "Character owner or DM access is required to level up.",
    };
  }

  const result = await completeLevelUpSubmission(
    { completeCharacterLevelUpForUser },
    session.user.id,
    character,
    values,
    formatDatabaseError,
  );

  if (!result.ok) {
    return result.state;
  }

  revalidateLevelUpPaths(campaign.id, character.id);
  redirect(
    `/campaigns/${campaign.id}/characters/${character.id}` as Route,
  );
}

function readLevelUpFormValues(formData: FormData): LevelUpFormValues {
  return {
    abilities: getStringField(formData, "abilities"),
    campaignId: getStringField(formData, "campaignId"),
    characterId: getStringField(formData, "characterId"),
    currentLevel: getStringField(formData, "currentLevel"),
    revision: getStringField(formData, "revision"),
    summary: getStringField(formData, "summary"),
  };
}

function getStringField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

function revalidateLevelUpPaths(
  campaignId: string,
  characterId: string,
) {
  revalidatePath("/");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/characters`);
  revalidatePath(`/campaigns/${campaignId}/characters/${characterId}`);
  revalidatePath(
    `/campaigns/${campaignId}/characters/${characterId}/level-up`,
  );
  revalidatePath("/sessions");
}
