"use server";

import type { Campaign } from "@dnd/types";
import { formatDatabaseError } from "@dnd/db";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/auth/server";
import { getCurrentCampaignAccess } from "@/campaigns/bootstrap";
import { isDatabaseCampaignId } from "@/campaigns/database-id";
import { listCharacterSummariesForUser } from "@/characters/repository";
import {
  createEntityForUser,
  listEntitySummariesForUser,
} from "@/entities/repository";
import {
  createSessionActionState,
  createSessionSubmission,
  updateSessionSubmission,
  validateSessionValues,
  type SessionActionState,
  type SessionFormValues,
} from "@/sessions/manage-session";
import {
  createSessionForUser,
  updateSessionForUser,
} from "@/sessions/repository";
import { listRuleSnippetsForUser } from "@/rules/repository";
import { collectWikiEntityCreationRequests } from "@/sessions/wiki-links";

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

  const availableReferences = await listAvailableReferences(
    session.user.id,
    campaign.id,
    values,
  );

  if ("formError" in availableReferences) {
    return availableReferences;
  }

  const preparedReferences = await prepareInlineWikiEntities(
    session.user.id,
    campaign,
    values,
    availableReferences,
  );

  if ("formError" in preparedReferences) {
    return preparedReferences;
  }

  const result = await createSessionSubmission(
    { createSessionForUser },
    session.user.id,
    campaign,
    values,
    formatDatabaseError,
    preparedReferences.entities,
    preparedReferences.rules,
    preparedReferences.characters,
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

  const availableReferences = await listAvailableReferences(
    session.user.id,
    campaign.id,
    values,
  );

  if ("formError" in availableReferences) {
    return availableReferences;
  }

  const preparedReferences = await prepareInlineWikiEntities(
    session.user.id,
    campaign,
    values,
    availableReferences,
  );

  if ("formError" in preparedReferences) {
    return preparedReferences;
  }

  const result = await updateSessionSubmission(
    { updateSessionForUser },
    session.user.id,
    campaign,
    values,
    formatDatabaseError,
    preparedReferences.entities,
    preparedReferences.rules,
    preparedReferences.characters,
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
    notesDocument: getStringField(formData, "notesDocument"),
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

type AvailableSessionReferences = {
  characters: Awaited<ReturnType<typeof listCharacterSummariesForUser>>;
  entities: Awaited<ReturnType<typeof listEntitySummariesForUser>>;
  rules: Awaited<ReturnType<typeof listRuleSnippetsForUser>>;
};

async function listAvailableReferences(
  userId: string,
  campaignId: string,
  values: SessionFormValues,
): Promise<AvailableSessionReferences | SessionActionState> {
  try {
    const [characters, entities, rules] = await Promise.all([
      listCharacterSummariesForUser(userId, campaignId),
      listEntitySummariesForUser(userId, campaignId),
      listRuleSnippetsForUser(userId, campaignId),
    ]);

    return {
      characters,
      entities,
      rules,
    };
  } catch (error) {
    return {
      ...createSessionActionState(values),
      formError: formatDatabaseError(error),
    };
  }
}

async function prepareInlineWikiEntities(
  userId: string,
  campaign: Campaign,
  values: SessionFormValues,
  references: AvailableSessionReferences,
): Promise<AvailableSessionReferences | SessionActionState> {
  const preflightValidation = validateSessionValues(
    values,
    campaign,
    references.entities,
    references.rules,
    references.characters,
  );

  if (Object.keys(preflightValidation.fieldErrors).length > 0) {
    return references;
  }

  const creationRequests = collectWikiEntityCreationRequests(
    preflightValidation.input.notesDocument,
    references.entities,
  );

  if (creationRequests.length === 0) {
    return references;
  }

  try {
    for (const request of creationRequests) {
      await createEntityForUser(userId, {
        campaignId: campaign.id,
        description: "",
        name: request.name,
        summary: "",
        type: request.type,
        visibility: "player-safe",
      });
    }

    return {
      ...references,
      entities: await listEntitySummariesForUser(userId, campaign.id),
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
