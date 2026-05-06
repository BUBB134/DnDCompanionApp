"use server";

import { formatDatabaseError } from "@dnd/db";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import {
  createSessionActionState,
  createSessionSubmission,
  updateSessionSubmission,
  type SessionActionState,
  type SessionFormValues,
} from "@/sessions/manage-session";
import {
  createSessionForUser,
  updateSessionForUser,
} from "@/sessions/repository";
import { listEntitySummariesForUser } from "@/entities/repository";

export async function createSessionAction(
  _previousState: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const values = readSessionFormValues(formData);

  if (!isDatabaseCampaignId(values.campaignId)) {
    return {
      ...createSessionActionState(values),
      formError: "Create or open a saved campaign before managing sessions.",
    };
  }

  const campaign = await getCurrentCampaignAccess(session, values.campaignId);

  if (!campaign) {
    return {
      ...createSessionActionState(values),
      formError: "Campaign access is required before creating sessions.",
    };
  }

  const availableEntities = await listAvailableEntities(
    session.user.id,
    campaign.id,
    values,
  );

  if ("formError" in availableEntities) {
    return availableEntities;
  }

  const result = await createSessionSubmission(
    { createSessionForUser },
    session.user.id,
    campaign,
    values,
    formatDatabaseError,
    availableEntities.entities,
  );

  if (result.ok) {
    revalidateSessionPaths(campaign.id);
  }

  return result.state;
}

export async function updateSessionAction(
  _previousState: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  void _previousState;
  const session = await requireAuthSession();
  const values = readSessionFormValues(formData);

  if (!isDatabaseCampaignId(values.campaignId)) {
    return {
      ...createSessionActionState(values),
      formError: "Create or open a saved campaign before managing sessions.",
    };
  }

  const campaign = await getCurrentCampaignAccess(session, values.campaignId);

  if (!campaign || campaign.id !== values.campaignId) {
    return {
      ...createSessionActionState(values),
      formError: "Campaign access is required before editing sessions.",
    };
  }

  const availableEntities = await listAvailableEntities(
    session.user.id,
    campaign.id,
    values,
  );

  if ("formError" in availableEntities) {
    return availableEntities;
  }

  const result = await updateSessionSubmission(
    { updateSessionForUser },
    session.user.id,
    campaign,
    values,
    formatDatabaseError,
    availableEntities.entities,
  );

  if (result.ok) {
    revalidateSessionPaths(campaign.id);
  }

  return result.state;
}

function readSessionFormValues(formData: FormData): SessionFormValues {
  return {
    campaignId: getStringField(formData, "campaignId"),
    notes: getStringField(formData, "notes"),
    sessionId: getStringField(formData, "sessionId"),
    taggedEntityIds: getStringFields(formData, "taggedEntityIds"),
    title: getStringField(formData, "title"),
    unresolvedHooks: getStringField(formData, "unresolvedHooks"),
  };
}

function getStringField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

function getStringFields(formData: FormData, fieldName: string) {
  return formData
    .getAll(fieldName)
    .filter((value): value is string => typeof value === "string");
}

async function listAvailableEntities(
  userId: string,
  campaignId: string,
  values: SessionFormValues,
) {
  try {
    return {
      entities: await listEntitySummariesForUser(userId, campaignId),
    };
  } catch (error) {
    return {
      ...createSessionActionState(values),
      formError: formatDatabaseError(error),
    };
  }
}

function revalidateSessionPaths(campaignId: string) {
  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath(`/campaigns/${campaignId}`);
}
