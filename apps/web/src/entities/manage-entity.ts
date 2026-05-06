import type {
  Campaign,
  CampaignEntity,
  EntityType,
  Visibility,
} from "@dnd/types";
import { entityTypes, isDungeonMaster, visibilities } from "@dnd/types";

const ENTITY_NAME_MAX_LENGTH = 100;
const ENTITY_SUMMARY_MAX_LENGTH = 280;
const ENTITY_DESCRIPTION_MAX_LENGTH = 4000;

export type EntityFormValues = {
  campaignId: string;
  description: string;
  entityId: string;
  name: string;
  summary: string;
  type: string;
  visibility: string;
};

export type EntityMutationInput = {
  campaignId: string;
  description: string;
  name: string;
  summary: string;
  type: EntityType;
  visibility: Visibility;
};

export type EntityFieldErrors = Partial<
  Record<keyof EntityFormValues, string>
>;

export type EntityActionState = {
  fieldErrors: EntityFieldErrors;
  formError: string | null;
  successMessage: string | null;
  values: EntityFormValues;
};

type CreateEntityRepository = {
  createEntityForUser(
    userId: string,
    input: EntityMutationInput,
  ): Promise<CampaignEntity>;
};

type UpdateEntityRepository = {
  updateEntityForUser(
    userId: string,
    entityId: string,
    input: EntityMutationInput,
  ): Promise<CampaignEntity>;
};

type EntitySubmissionResult =
  | {
      entity: CampaignEntity;
      ok: true;
      state: EntityActionState;
    }
  | {
      ok: false;
      state: EntityActionState;
    };

export const emptyEntityFormValues: EntityFormValues = {
  campaignId: "",
  description: "",
  entityId: "",
  name: "",
  summary: "",
  type: "npc",
  visibility: "player-safe",
};

export function createEntityActionState(
  values: Partial<EntityFormValues> = {},
): EntityActionState {
  return {
    fieldErrors: {},
    formError: null,
    successMessage: null,
    values: {
      ...emptyEntityFormValues,
      ...values,
    },
  };
}

export async function createEntitySubmission(
  repository: CreateEntityRepository,
  userId: string,
  campaign: Campaign,
  values: EntityFormValues,
  formatError: (error: unknown) => string,
): Promise<EntitySubmissionResult> {
  const validation = validateEntityValues(values, campaign);

  if (hasFieldErrors(validation.fieldErrors)) {
    return {
      ok: false,
      state: {
        fieldErrors: validation.fieldErrors,
        formError: null,
        successMessage: null,
        values: validation.values,
      },
    };
  }

  try {
    const entity = await repository.createEntityForUser(userId, validation.input);

    return {
      entity,
      ok: true,
      state: createEntityActionState({
        campaignId: campaign.id,
        type: validation.input.type,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      state: {
        fieldErrors: {},
        formError: formatError(error),
        successMessage: null,
        values: validation.values,
      },
    };
  }
}

export async function updateEntitySubmission(
  repository: UpdateEntityRepository,
  userId: string,
  campaign: Campaign,
  values: EntityFormValues,
  formatError: (error: unknown) => string,
): Promise<EntitySubmissionResult> {
  const validation = validateEntityValues(values, campaign);
  const entityId = values.entityId.trim();

  if (!entityId) {
    validation.fieldErrors.entityId = "Entity id is required.";
  }

  if (hasFieldErrors(validation.fieldErrors)) {
    return {
      ok: false,
      state: {
        fieldErrors: validation.fieldErrors,
        formError: null,
        successMessage: null,
        values: validation.values,
      },
    };
  }

  try {
    const entity = await repository.updateEntityForUser(
      userId,
      entityId,
      validation.input,
    );

    return {
      entity,
      ok: true,
      state: {
        fieldErrors: {},
        formError: null,
        successMessage: "Entity saved.",
        values: entityToFormValues(campaign.id, entity),
      },
    };
  } catch (error) {
    return {
      ok: false,
      state: {
        fieldErrors: {},
        formError: formatError(error),
        successMessage: null,
        values: validation.values,
      },
    };
  }
}

export function entityToFormValues(
  campaignId: string,
  entity: CampaignEntity,
): EntityFormValues {
  return {
    campaignId,
    description: entity.description,
    entityId: entity.id,
    name: entity.name,
    summary: entity.summary,
    type: entity.type,
    visibility: entity.visibility,
  };
}

export function validateEntityValues(values: EntityFormValues, campaign: Campaign) {
  const normalizedType = normalizeEntityType(values.type);
  const normalizedVisibility = normalizeVisibility(values.visibility);
  const normalizedValues = {
    campaignId: values.campaignId.trim(),
    description: values.description.trim(),
    entityId: values.entityId.trim(),
    name: values.name.trim(),
    summary: values.summary.trim(),
    type: normalizedType ?? values.type,
    visibility: normalizedVisibility ?? values.visibility,
  };
  const fieldErrors: EntityFieldErrors = {};

  if (normalizedValues.campaignId !== campaign.id) {
    fieldErrors.campaignId = "Entity must belong to the selected campaign.";
  }

  if (normalizedValues.name.length === 0) {
    fieldErrors.name = "Entity name is required.";
  } else if (normalizedValues.name.length > ENTITY_NAME_MAX_LENGTH) {
    fieldErrors.name =
      `Entity name must be ${ENTITY_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (!normalizedType) {
    fieldErrors.type = "Choose a supported entity type.";
  }

  if (normalizedValues.summary.length > ENTITY_SUMMARY_MAX_LENGTH) {
    fieldErrors.summary =
      `Summary must be ${ENTITY_SUMMARY_MAX_LENGTH} characters or fewer.`;
  }

  if (normalizedValues.description.length > ENTITY_DESCRIPTION_MAX_LENGTH) {
    fieldErrors.description =
      `Description must be ${ENTITY_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  if (!normalizedVisibility) {
    fieldErrors.visibility = "Choose a supported visibility.";
  } else if (!isDungeonMaster(campaign.role) && normalizedVisibility === "dm-only") {
    fieldErrors.visibility = "Only DMs can mark entities as DM only.";
  }

  return {
    fieldErrors,
    input: {
      campaignId: normalizedValues.campaignId,
      description: normalizedValues.description,
      name: normalizedValues.name,
      summary: normalizedValues.summary,
      type: normalizedType ?? "npc",
      visibility: normalizedVisibility ?? "player-safe",
    } satisfies EntityMutationInput,
    values: normalizedValues,
  };
}

function normalizeEntityType(value: string): EntityType | null {
  return entityTypes.includes(value as EntityType) ? (value as EntityType) : null;
}

function normalizeVisibility(value: string): Visibility | null {
  return visibilities.includes(value as Visibility) ? (value as Visibility) : null;
}

function hasFieldErrors(fieldErrors: EntityFieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}
