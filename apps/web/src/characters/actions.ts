"use server";

import { formatDatabaseError } from "@dnd/db";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import {
  createCharacterActionState,
  createCharacterSubmission,
  updateCharacterSubmission,
  type CharacterActionState,
  type CharacterFormValues,
} from "@/characters/manage-character";
import {
  createCharacterForUser,
  updateCharacterForUser,
} from "@/characters/repository";

export async function createCharacterAction(
  _previousState: CharacterActionState,
  formData: FormData,
): Promise<CharacterActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const values = readCharacterFormValues(formData);

  if (!isDatabaseCampaignId(values.campaignId)) {
    return {
      ...createCharacterActionState(values),
      formError: "Create or open a saved campaign before managing characters.",
    };
  }

  const campaign = await getCurrentCampaignAccess(session, values.campaignId);

  if (!campaign) {
    return {
      ...createCharacterActionState(values),
      formError: "Campaign access is required before creating characters.",
    };
  }

  const result = await createCharacterSubmission(
    { createCharacterForUser },
    session.user.id,
    campaign,
    values,
    formatDatabaseError,
  );

  if (!result.ok) {
    return result.state;
  }

  revalidateCharacterPaths(campaign.id, result.character.id);
  redirect(
    `/campaigns/${campaign.id}/characters/${result.character.id}` as Route,
  );
}

export async function updateCharacterAction(
  _previousState: CharacterActionState,
  formData: FormData,
): Promise<CharacterActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const values = readCharacterFormValues(formData);

  if (!isDatabaseCampaignId(values.campaignId)) {
    return {
      ...createCharacterActionState(values),
      formError: "Create or open a saved campaign before managing characters.",
    };
  }

  const campaign = await getCurrentCampaignAccess(session, values.campaignId);

  if (!campaign) {
    return {
      ...createCharacterActionState(values),
      formError: "Campaign access is required before editing characters.",
    };
  }

  const result = await updateCharacterSubmission(
    { updateCharacterForUser },
    session.user.id,
    campaign,
    values,
    formatDatabaseError,
  );

  if (result.ok) {
    revalidateCharacterPaths(campaign.id, result.character.id);
  }

  return result.state;
}

function readCharacterFormValues(formData: FormData): CharacterFormValues {
  return {
    abilities: getStringField(formData, "abilities"),
    ancestry: getStringField(formData, "ancestry"),
    background: getStringField(formData, "background"),
    backstory: getStringField(formData, "backstory"),
    campaignId: getStringField(formData, "campaignId"),
    characterId: getStringField(formData, "characterId"),
    className: getStringField(formData, "className"),
    goals: getStringField(formData, "goals"),
    inventoryNotes: getStringField(formData, "inventoryNotes"),
    level: getStringField(formData, "level"),
    name: getStringField(formData, "name"),
    personalNotes: getStringField(formData, "personalNotes"),
    relationships: getStringField(formData, "relationships"),
    revision: getStringField(formData, "revision"),
    summary: getStringField(formData, "summary"),
    visibility: getStringField(formData, "visibility"),
  };
}

function getStringField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

function revalidateCharacterPaths(campaignId: string, characterId: string) {
  revalidatePath("/");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/characters`);
  revalidatePath(`/campaigns/${campaignId}/characters/${characterId}`);
  revalidatePath("/sessions");
}
