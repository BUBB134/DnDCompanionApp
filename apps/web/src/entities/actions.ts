"use server";

import { formatDatabaseError } from "@dnd/db";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import {
  createEntitySubmission,
  createEntityActionState,
  updateEntitySubmission,
  type EntityActionState,
  type EntityFormValues,
} from "@/entities/manage-entity";
import {
  createEntityForUser,
  deleteEntityForUser,
  updateEntityForUser,
} from "@/entities/repository";

export type DeleteEntityActionState = {
  formError: string | null;
};

export const initialDeleteEntityActionState: DeleteEntityActionState = {
  formError: null,
};

export async function createEntityAction(
  _previousState: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const values = readEntityFormValues(formData);

  if (!isDatabaseCampaignId(values.campaignId)) {
    return {
      ...createEntityActionState(values),
      formError: "Create or open a saved campaign before managing entities.",
    };
  }

  const campaign = await getCurrentCampaignAccess(session, values.campaignId);

  if (!campaign) {
    return {
      ...createEntityActionState(values),
      formError: "Campaign access is required before creating entities.",
    };
  }

  const result = await createEntitySubmission(
    { createEntityForUser },
    session.user.id,
    campaign,
    values,
    formatDatabaseError,
  );

  if (result.ok) {
    revalidateCampaignEntityPaths(campaign.id);
  }

  return result.state;
}

export async function updateEntityAction(
  _previousState: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const values = readEntityFormValues(formData);

  if (!isDatabaseCampaignId(values.campaignId)) {
    return {
      ...createEntityActionState(values),
      formError: "Create or open a saved campaign before managing entities.",
    };
  }

  const campaign = await getCurrentCampaignAccess(session, values.campaignId);

  if (!campaign) {
    return {
      ...createEntityActionState(values),
      formError: "Campaign access is required before editing entities.",
    };
  }

  const result = await updateEntitySubmission(
    { updateEntityForUser },
    session.user.id,
    campaign,
    values,
    formatDatabaseError,
  );

  if (result.ok) {
    revalidateCampaignEntityPaths(campaign.id);
  }

  return result.state;
}

export async function deleteEntityAction(
  _previousState: DeleteEntityActionState,
  formData: FormData,
) {
  void _previousState;
  const session = await requireAuthSession();
  const campaignId = getStringField(formData, "campaignId");
  const entityId = getStringField(formData, "entityId");

  if (!isDatabaseCampaignId(campaignId)) {
    return {
      formError: "Create or open a saved campaign before deleting entities.",
    };
  }

  const campaign = await getCurrentCampaignAccess(session, campaignId);

  if (!campaign || campaign.id !== campaignId) {
    return {
      formError: "Campaign access is required before deleting entities.",
    };
  }

  if (!entityId) {
    return {
      formError: "Entity id is required.",
    };
  }

  try {
    await deleteEntityForUser(session.user.id, campaign.id, entityId);
    revalidateCampaignEntityPaths(campaign.id);

    return initialDeleteEntityActionState;
  } catch (error) {
    return {
      formError: formatDatabaseError(error),
    };
  }
}

function readEntityFormValues(formData: FormData): EntityFormValues {
  return {
    campaignId: getStringField(formData, "campaignId"),
    description: getStringField(formData, "description"),
    entityId: getStringField(formData, "entityId"),
    name: getStringField(formData, "name"),
    summary: getStringField(formData, "summary"),
    type: getStringField(formData, "type"),
    visibility: getStringField(formData, "visibility"),
  };
}

function getStringField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

function revalidateCampaignEntityPaths(campaignId: string) {
  revalidatePath("/");
  revalidatePath("/entities");
  revalidatePath(`/campaigns/${campaignId}`);
}
