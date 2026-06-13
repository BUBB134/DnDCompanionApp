"use server";

import type { Campaign } from "@dnd/types";
import {
  formatDatabaseError,
  withDatabaseTransaction,
  type DatabaseQueryable,
} from "@dnd/db";
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
  sessionToFormValues,
  SESSION_TAGS_MAX_COUNT,
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

  const result = await saveSessionWithInlineWikiEntities(
    "create",
    session.user.id,
    campaign,
    values,
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
  const session = await requireAuthSession();
  const values = readSessionFormValues(formData);

  if (!isDatabaseCampaignId(values.campaignId)) {
    return {
      ...createSessionActionState(values),
      formError: "Create or open a saved campaign before managing sessions.",
      savedSessionRevision: _previousState.savedSessionRevision,
    };
  }

  const campaign = await getCurrentCampaignAccess(session, values.campaignId);

  if (!campaign || campaign.id !== values.campaignId) {
    return {
      ...createSessionActionState(values),
      formError: "Campaign access is required before editing sessions.",
      savedSessionRevision: _previousState.savedSessionRevision,
    };
  }

  const result = await saveSessionWithInlineWikiEntities(
    "update",
    session.user.id,
    campaign,
    values,
  );

  if (result.ok) {
    revalidateSessionPaths(campaign.id);
  }

  return result.ok || result.state.savedSessionRevision
    ? result.state
    : {
        ...result.state,
        savedSessionRevision: _previousState.savedSessionRevision,
      };
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

type SessionSaveMode = "create" | "update";

async function saveSessionWithInlineWikiEntities(
  mode: SessionSaveMode,
  userId: string,
  campaign: Campaign,
  values: SessionFormValues,
) {
  try {
    return await withDatabaseTransaction(async (client) => {
      const references = await listAvailableReferences(
        userId,
        campaign.id,
        client,
      );
      const initialValidation = validateSessionForSave(
        mode,
        values,
        campaign,
        references,
      );

      if (hasFieldErrors(initialValidation.fieldErrors)) {
        return {
          ok: false,
          state: createSessionValidationErrorState(initialValidation),
        };
      }

      const preparedReferences = await prepareInlineWikiEntities(
        userId,
        campaign,
        values,
        references,
        client,
      );

      if ("formError" in preparedReferences) {
        return {
          ok: false,
          state: preparedReferences,
        };
      }

      const validation = validateSessionForSave(
        mode,
        values,
        campaign,
        preparedReferences,
      );

      if (hasFieldErrors(validation.fieldErrors)) {
        return {
          ok: false,
          state: createSessionValidationErrorState(validation),
        };
      }

      if (mode === "create") {
        const session = await createSessionForUser(
          userId,
          validation.input,
          client,
        );

        return {
          ok: true,
          state: {
            ...createSessionActionState({
              campaignId: campaign.id,
            }),
            savedSessionId: session.id,
            savedSessionRevision: session.updatedAt,
            successMessage: "Session saved.",
          },
        };
      }

      const session = await updateSessionForUser(
        userId,
        validation.values.sessionId,
        validation.input,
        client,
      );

      return {
        ok: true,
        state: {
          fieldErrors: {},
          formError: null,
          savedSessionId: session.id,
          savedSessionRevision: session.updatedAt,
          successMessage: "Session saved.",
          values: sessionToFormValues(campaign.id, session),
        },
      };
    });
  } catch (error) {
    return {
      ok: false,
      state: {
        ...createSessionActionState(values),
        formError: formatDatabaseError(error),
      },
    };
  }
}

async function listAvailableReferences(
  userId: string,
  campaignId: string,
  client: DatabaseQueryable,
): Promise<AvailableSessionReferences> {
  const characters = await listCharacterSummariesForUser(
    userId,
    campaignId,
    client,
  );
  const entities = await listEntitySummariesForUser(userId, campaignId, client);
  const rules = await listRuleSnippetsForUser(
    userId,
    campaignId,
    "",
    "",
    client,
  );

  return {
    characters,
    entities,
    rules,
  };
}

async function prepareInlineWikiEntities(
  userId: string,
  campaign: Campaign,
  values: SessionFormValues,
  references: AvailableSessionReferences,
  client: DatabaseQueryable,
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

  if (
    preflightValidation.input.taggedEntityIds.length + creationRequests.length >
    SESSION_TAGS_MAX_COUNT
  ) {
    return {
      fieldErrors: {
        taggedEntityIds: `Keep tagged entities to ${SESSION_TAGS_MAX_COUNT} or fewer.`,
      },
      formError: null,
      savedSessionId: null,
      savedSessionRevision: null,
      successMessage: null,
      values: preflightValidation.values,
    };
  }

  if (creationRequests.length === 0) {
    return references;
  }

  for (const request of creationRequests) {
    await createEntityForUser(
      userId,
      {
        campaignId: campaign.id,
        description: "",
        name: request.name,
        summary: "",
        type: request.type,
        visibility: "player-safe",
      },
      client,
    );
  }

  return {
    ...references,
    entities: await listEntitySummariesForUser(userId, campaign.id, client),
  };
}

function validateSessionForSave(
  mode: SessionSaveMode,
  values: SessionFormValues,
  campaign: Campaign,
  references: AvailableSessionReferences,
) {
  const validation = validateSessionValues(
    values,
    campaign,
    references.entities,
    references.rules,
    references.characters,
  );

  if (mode === "update" && validation.values.sessionId.length === 0) {
    validation.fieldErrors.sessionId = "Session id is required.";
  }

  return validation;
}

function createSessionValidationErrorState(
  validation: ReturnType<typeof validateSessionValues>,
): SessionActionState {
  return {
    fieldErrors: validation.fieldErrors,
    formError: null,
    savedSessionId: null,
    savedSessionRevision: null,
    successMessage: null,
    values: validation.values,
  };
}

function hasFieldErrors(
  fieldErrors: ReturnType<typeof validateSessionValues>["fieldErrors"],
) {
  return Object.keys(fieldErrors).length > 0;
}

function revalidateSessionPaths(campaignId: string) {
  revalidatePath("/");
  revalidatePath("/entities");
  revalidatePath("/sessions");
  revalidatePath(`/campaigns/${campaignId}`);
}
