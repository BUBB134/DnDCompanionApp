import type {
  Campaign,
  CampaignEntitySummary,
  CampaignSession,
} from "@dnd/types";
import { isDatabaseCampaignId } from "@/campaigns/database-id";

const SESSION_TITLE_MAX_LENGTH = 120;
const SESSION_NOTES_MAX_LENGTH = 10000;
const SESSION_HOOK_MAX_LENGTH = 180;
const SESSION_HOOKS_MAX_COUNT = 12;
const SESSION_TAGS_MAX_COUNT = 24;

export type SessionFormValues = {
  campaignId: string;
  notes: string;
  sessionId: string;
  taggedEntityIds: string[];
  title: string;
  unresolvedHooks: string;
};

export type SessionMutationInput = {
  campaignId: string;
  notes: string;
  taggedEntityIds: string[];
  title: string;
  unresolvedHooks: string[];
};

export type SessionFieldErrors = Partial<
  Record<keyof SessionFormValues, string>
>;

export type SessionActionState = {
  fieldErrors: SessionFieldErrors;
  formError: string | null;
  savedSessionId: string | null;
  successMessage: string | null;
  values: SessionFormValues;
};

type CreateSessionRepository = {
  createSessionForUser(
    userId: string,
    input: SessionMutationInput,
  ): Promise<CampaignSession>;
};

type UpdateSessionRepository = {
  updateSessionForUser(
    userId: string,
    sessionId: string,
    input: SessionMutationInput,
  ): Promise<CampaignSession>;
};

type SessionSubmissionResult =
  | {
      ok: true;
      session: CampaignSession;
      state: SessionActionState;
    }
  | {
      ok: false;
      state: SessionActionState;
    };

export const emptySessionFormValues: SessionFormValues = {
  campaignId: "",
  notes: "",
  sessionId: "",
  taggedEntityIds: [],
  title: "",
  unresolvedHooks: "",
};

export function createSessionActionState(
  values: Partial<SessionFormValues> = {},
): SessionActionState {
  return {
    fieldErrors: {},
    formError: null,
    savedSessionId: null,
    successMessage: null,
    values: {
      ...emptySessionFormValues,
      ...values,
    },
  };
}

export async function createSessionSubmission(
  repository: CreateSessionRepository,
  userId: string,
  campaign: Campaign,
  values: SessionFormValues,
  formatError: (error: unknown) => string,
  availableEntities: readonly CampaignEntitySummary[] = [],
): Promise<SessionSubmissionResult> {
  const validation = validateSessionValues(values, campaign, availableEntities);

  if (hasFieldErrors(validation.fieldErrors)) {
    return {
      ok: false,
      state: {
        fieldErrors: validation.fieldErrors,
        formError: null,
        savedSessionId: null,
        successMessage: null,
        values: validation.values,
      },
    };
  }

  try {
    const session = await repository.createSessionForUser(
      userId,
      validation.input,
    );

    return {
      ok: true,
      session,
      state: {
        ...createSessionActionState({
          campaignId: campaign.id,
        }),
        savedSessionId: session.id,
        successMessage: "Session saved.",
      },
    };
  } catch (error) {
    return {
      ok: false,
      state: {
        fieldErrors: {},
        formError: formatError(error),
        savedSessionId: null,
        successMessage: null,
        values: validation.values,
      },
    };
  }
}

export async function updateSessionSubmission(
  repository: UpdateSessionRepository,
  userId: string,
  campaign: Campaign,
  values: SessionFormValues,
  formatError: (error: unknown) => string,
  availableEntities: readonly CampaignEntitySummary[] = [],
): Promise<SessionSubmissionResult> {
  const validation = validateSessionValues(values, campaign, availableEntities);
  const sessionId = values.sessionId.trim();

  if (!sessionId) {
    validation.fieldErrors.sessionId = "Session id is required.";
  }

  if (hasFieldErrors(validation.fieldErrors)) {
    return {
      ok: false,
      state: {
        fieldErrors: validation.fieldErrors,
        formError: null,
        savedSessionId: null,
        successMessage: null,
        values: validation.values,
      },
    };
  }

  try {
    const session = await repository.updateSessionForUser(
      userId,
      sessionId,
      validation.input,
    );

    return {
      ok: true,
      session,
      state: {
        fieldErrors: {},
        formError: null,
        savedSessionId: session.id,
        successMessage: "Session saved.",
        values: sessionToFormValues(campaign.id, session),
      },
    };
  } catch (error) {
    return {
      ok: false,
      state: {
        fieldErrors: {},
        formError: formatError(error),
        savedSessionId: null,
        successMessage: null,
        values: validation.values,
      },
    };
  }
}

export function sessionToFormValues(
  campaignId: string,
  session: CampaignSession,
): SessionFormValues {
  return {
    campaignId,
    notes: session.notes,
    sessionId: session.id,
    taggedEntityIds: session.taggedEntities.map((entity) => entity.id),
    title: session.title,
    unresolvedHooks: session.unresolvedHooks.join("\n"),
  };
}

export function validateSessionValues(
  values: SessionFormValues,
  campaign: Campaign,
  availableEntities: readonly CampaignEntitySummary[] = [],
) {
  const normalizedTaggedEntityIds = normalizeTaggedEntityIds(
    values.taggedEntityIds,
    availableEntities,
  );
  const normalizedValues = {
    campaignId: values.campaignId.trim(),
    notes: values.notes.trim(),
    sessionId: values.sessionId.trim(),
    taggedEntityIds: normalizedTaggedEntityIds.ids,
    title: values.title.trim(),
    unresolvedHooks: values.unresolvedHooks.trim(),
  };
  const unresolvedHooks = parseUnresolvedHooks(normalizedValues.unresolvedHooks);
  const fieldErrors: SessionFieldErrors = {};

  if (!isDatabaseCampaignId(normalizedValues.campaignId)) {
    fieldErrors.campaignId = "Create or open a saved campaign before managing sessions.";
  } else if (normalizedValues.campaignId !== campaign.id) {
    fieldErrors.campaignId = "Session must belong to the selected campaign.";
  }

  if (normalizedValues.title.length === 0) {
    fieldErrors.title = "Session title is required.";
  } else if (normalizedValues.title.length > SESSION_TITLE_MAX_LENGTH) {
    fieldErrors.title =
      `Session title must be ${SESSION_TITLE_MAX_LENGTH} characters or fewer.`;
  }

  if (normalizedValues.notes.length > SESSION_NOTES_MAX_LENGTH) {
    fieldErrors.notes =
      `Notes must be ${SESSION_NOTES_MAX_LENGTH} characters or fewer.`;
  }

  if (unresolvedHooks.length > SESSION_HOOKS_MAX_COUNT) {
    fieldErrors.unresolvedHooks =
      `Keep unresolved hooks to ${SESSION_HOOKS_MAX_COUNT} items or fewer.`;
  } else if (
    unresolvedHooks.some((hook) => hook.length > SESSION_HOOK_MAX_LENGTH)
  ) {
    fieldErrors.unresolvedHooks =
      `Each unresolved hook must be ${SESSION_HOOK_MAX_LENGTH} characters or fewer.`;
  }

  if (normalizedTaggedEntityIds.hasUnavailableEntity) {
    fieldErrors.taggedEntityIds =
      "Choose only visible entities from this campaign.";
  } else if (normalizedTaggedEntityIds.ids.length > SESSION_TAGS_MAX_COUNT) {
    fieldErrors.taggedEntityIds =
      `Keep tagged entities to ${SESSION_TAGS_MAX_COUNT} or fewer.`;
  }

  return {
    fieldErrors,
    input: {
      campaignId: normalizedValues.campaignId,
      notes: normalizedValues.notes,
      taggedEntityIds: normalizedValues.taggedEntityIds,
      title: normalizedValues.title,
      unresolvedHooks,
    } satisfies SessionMutationInput,
    values: {
      ...normalizedValues,
      unresolvedHooks: unresolvedHooks.join("\n"),
    },
  };
}

function normalizeTaggedEntityIds(
  entityIds: readonly string[],
  availableEntities: readonly CampaignEntitySummary[],
) {
  const availableEntityIds = new Set(
    availableEntities.map((entity) => entity.id),
  );
  const ids: string[] = [];
  let hasUnavailableEntity = false;

  for (const entityId of entityIds) {
    const normalizedEntityId = entityId.trim();

    if (!normalizedEntityId || ids.includes(normalizedEntityId)) {
      continue;
    }

    if (!availableEntityIds.has(normalizedEntityId)) {
      hasUnavailableEntity = true;
      continue;
    }

    ids.push(normalizedEntityId);
  }

  return {
    hasUnavailableEntity,
    ids,
  };
}

function parseUnresolvedHooks(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

function hasFieldErrors(fieldErrors: SessionFieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}
