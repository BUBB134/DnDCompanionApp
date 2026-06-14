import type {
  Campaign,
  CampaignCharacterFullView,
  Visibility,
} from "@dnd/types";
import { isDungeonMaster, visibilities } from "@dnd/types";
import { isDatabaseCampaignId } from "@/campaigns/database-id";

const CHARACTER_NAME_MAX_LENGTH = 100;
const CHARACTER_SHORT_FIELD_MAX_LENGTH = 100;
const CHARACTER_SUMMARY_MAX_LENGTH = 280;
const CHARACTER_DETAIL_MAX_LENGTH = 4000;
const CHARACTER_ABILITY_MAX_COUNT = 12;
const CHARACTER_ABILITY_NAME_MAX_LENGTH = 80;
const CHARACTER_ABILITY_SUMMARY_MAX_LENGTH = 280;
const CHARACTER_ABILITY_TRIGGER_MAX_LENGTH = 160;

export type CharacterAbilityInput = {
  name: string;
  summary: string;
  trigger: string;
};

export type CharacterFormValues = {
  abilities: string;
  ancestry: string;
  background: string;
  backstory: string;
  campaignId: string;
  characterId: string;
  className: string;
  goals: string;
  inventoryNotes: string;
  level: string;
  name: string;
  personalNotes: string;
  relationships: string;
  revision: string;
  summary: string;
  visibility: string;
};

export type CharacterMutationInput = {
  abilities: CharacterAbilityInput[];
  ancestry: string | null;
  background: string | null;
  backstory: string;
  campaignId: string;
  className: string | null;
  goals: string;
  inventoryNotes: string;
  level: number;
  name: string;
  personalNotes: string;
  relationships: string;
  summary: string;
  visibility: Visibility;
};

export type CharacterFieldErrors = Partial<
  Record<keyof CharacterFormValues, string>
>;

export type CharacterActionState = {
  fieldErrors: CharacterFieldErrors;
  formError: string | null;
  successMessage: string | null;
  values: CharacterFormValues;
};

type CreateCharacterRepository = {
  createCharacterForUser(
    userId: string,
    input: CharacterMutationInput,
  ): Promise<CampaignCharacterFullView>;
};

type UpdateCharacterRepository = {
  updateCharacterForUser(
    userId: string,
    characterId: string,
    input: CharacterMutationInput,
    expectedRevision: string,
  ): Promise<CampaignCharacterFullView>;
};

type CharacterSubmissionResult =
  | {
      character: CampaignCharacterFullView;
      ok: true;
      state: CharacterActionState;
    }
  | {
      ok: false;
      state: CharacterActionState;
    };

export const emptyCharacterFormValues: CharacterFormValues = {
  abilities: "",
  ancestry: "",
  background: "",
  backstory: "",
  campaignId: "",
  characterId: "",
  className: "",
  goals: "",
  inventoryNotes: "",
  level: "1",
  name: "",
  personalNotes: "",
  relationships: "",
  revision: "",
  summary: "",
  visibility: "player-safe",
};

export function createCharacterActionState(
  values: Partial<CharacterFormValues> = {},
): CharacterActionState {
  return {
    fieldErrors: {},
    formError: null,
    successMessage: null,
    values: {
      ...emptyCharacterFormValues,
      ...values,
    },
  };
}

export async function createCharacterSubmission(
  repository: CreateCharacterRepository,
  userId: string,
  campaign: Campaign,
  values: CharacterFormValues,
  formatError: (error: unknown) => string,
): Promise<CharacterSubmissionResult> {
  const validation = validateCharacterValues(values, campaign);

  if (hasFieldErrors(validation.fieldErrors)) {
    return {
      ok: false,
      state: createValidationState(validation),
    };
  }

  try {
    const character = await repository.createCharacterForUser(
      userId,
      validation.input,
    );

    return {
      character,
      ok: true,
      state: createCharacterActionState({
        campaignId: campaign.id,
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

export async function updateCharacterSubmission(
  repository: UpdateCharacterRepository,
  userId: string,
  campaign: Campaign,
  values: CharacterFormValues,
  formatError: (error: unknown) => string,
): Promise<CharacterSubmissionResult> {
  const validation = validateCharacterValues(values, campaign, {
    allowPreservedDmOnlyVisibility: true,
  });
  const characterId = values.characterId.trim();
  const revision = values.revision.trim();

  if (!characterId) {
    validation.fieldErrors.characterId = "Character id is required.";
  }

  if (!revision || Number.isNaN(Date.parse(revision))) {
    validation.fieldErrors.revision =
      "Reload this character before saving changes.";
  }

  if (hasFieldErrors(validation.fieldErrors)) {
    return {
      ok: false,
      state: createValidationState(validation),
    };
  }

  try {
    const character = await repository.updateCharacterForUser(
      userId,
      characterId,
      validation.input,
      revision,
    );

    return {
      character,
      ok: true,
      state: {
        fieldErrors: {},
        formError: null,
        successMessage: "Character saved.",
        values: characterToFormValues(campaign.id, character),
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

export function characterToFormValues(
  campaignId: string,
  character: CampaignCharacterFullView,
): CharacterFormValues {
  return {
    abilities: character.abilities
      .map((ability) =>
        [ability.name, ability.summary, ability.trigger ?? ""].join(" | "),
      )
      .join("\n"),
    ancestry: character.ancestry ?? "",
    background: character.background ?? "",
    backstory: character.backstory,
    campaignId,
    characterId: character.id,
    className: character.className ?? "",
    goals: character.goals,
    inventoryNotes: character.inventoryNotes,
    level: String(character.level),
    name: character.name,
    personalNotes: character.personalNotes,
    relationships: character.relationships,
    revision: character.updatedAt,
    summary: character.summary,
    visibility: character.visibility,
  };
}

export function validateCharacterValues(
  values: CharacterFormValues,
  campaign: Campaign,
  options: {
    allowPreservedDmOnlyVisibility?: boolean;
  } = {},
) {
  const normalizedVisibility = normalizeVisibility(values.visibility);
  const normalizedLevel = Number(values.level.trim());
  const abilityResult = parseAbilitySummaries(values.abilities);
  const normalizedValues = {
    abilities: values.abilities.trim(),
    ancestry: values.ancestry.trim(),
    background: values.background.trim(),
    backstory: values.backstory.trim(),
    campaignId: values.campaignId.trim(),
    characterId: values.characterId.trim(),
    className: values.className.trim(),
    goals: values.goals.trim(),
    inventoryNotes: values.inventoryNotes.trim(),
    level: values.level.trim(),
    name: values.name.trim(),
    personalNotes: values.personalNotes.trim(),
    relationships: values.relationships.trim(),
    revision: values.revision.trim(),
    summary: values.summary.trim(),
    visibility: normalizedVisibility ?? values.visibility,
  };
  const fieldErrors: CharacterFieldErrors = {};

  if (!isDatabaseCampaignId(normalizedValues.campaignId)) {
    fieldErrors.campaignId =
      "Create or open a saved campaign before managing characters.";
  } else if (normalizedValues.campaignId !== campaign.id) {
    fieldErrors.campaignId = "Character must belong to the selected campaign.";
  }

  if (normalizedValues.name.length === 0) {
    fieldErrors.name = "Character name is required.";
  } else if (normalizedValues.name.length > CHARACTER_NAME_MAX_LENGTH) {
    fieldErrors.name =
      `Character name must be ${CHARACTER_NAME_MAX_LENGTH} characters or fewer.`;
  }

  validateShortField(normalizedValues.className, "className", fieldErrors);
  validateShortField(normalizedValues.ancestry, "ancestry", fieldErrors);
  validateShortField(normalizedValues.background, "background", fieldErrors);

  if (
    !Number.isInteger(normalizedLevel) ||
    normalizedLevel < 1 ||
    normalizedLevel > 20
  ) {
    fieldErrors.level = "Level must be a whole number from 1 to 20.";
  }

  if (normalizedValues.summary.length > CHARACTER_SUMMARY_MAX_LENGTH) {
    fieldErrors.summary =
      `Summary must be ${CHARACTER_SUMMARY_MAX_LENGTH} characters or fewer.`;
  }

  for (const field of [
    "backstory",
    "goals",
    "relationships",
    "inventoryNotes",
    "personalNotes",
  ] as const) {
    if (normalizedValues[field].length > CHARACTER_DETAIL_MAX_LENGTH) {
      fieldErrors[field] =
        `Keep this field to ${CHARACTER_DETAIL_MAX_LENGTH} characters or fewer.`;
    }
  }

  if (abilityResult.error) {
    fieldErrors.abilities = abilityResult.error;
  }

  if (!normalizedVisibility) {
    fieldErrors.visibility = "Choose a supported visibility.";
  } else if (
    !isDungeonMaster(campaign.role) &&
    normalizedVisibility === "dm-only" &&
    !options.allowPreservedDmOnlyVisibility
  ) {
    fieldErrors.visibility = "Only DMs can mark characters as DM only.";
  }

  return {
    fieldErrors,
    input: {
      abilities: abilityResult.abilities,
      ancestry: normalizedValues.ancestry || null,
      background: normalizedValues.background || null,
      backstory: normalizedValues.backstory,
      campaignId: normalizedValues.campaignId,
      className: normalizedValues.className || null,
      goals: normalizedValues.goals,
      inventoryNotes: normalizedValues.inventoryNotes,
      level: Number.isInteger(normalizedLevel) ? normalizedLevel : 1,
      name: normalizedValues.name,
      personalNotes: normalizedValues.personalNotes,
      relationships: normalizedValues.relationships,
      summary: normalizedValues.summary,
      visibility: normalizedVisibility ?? "player-safe",
    } satisfies CharacterMutationInput,
    values: normalizedValues,
  };
}

function parseAbilitySummaries(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > CHARACTER_ABILITY_MAX_COUNT) {
    return {
      abilities: [],
      error: `Add ${CHARACTER_ABILITY_MAX_COUNT} ability summaries or fewer.`,
    };
  }

  const abilities: CharacterAbilityInput[] = [];

  for (const [index, line] of lines.entries()) {
    const [name = "", summary = "", trigger = "", ...extra] = line
      .split("|")
      .map((part) => part.trim());

    if (extra.length > 0 || !name || !summary) {
      return {
        abilities: [],
        error: `Ability line ${index + 1} must use Name | Summary | Optional trigger.`,
      };
    }

    if (name.length > CHARACTER_ABILITY_NAME_MAX_LENGTH) {
      return {
        abilities: [],
        error: `Ability name on line ${index + 1} must be ${CHARACTER_ABILITY_NAME_MAX_LENGTH} characters or fewer.`,
      };
    }

    if (summary.length > CHARACTER_ABILITY_SUMMARY_MAX_LENGTH) {
      return {
        abilities: [],
        error: `Ability summary on line ${index + 1} must be ${CHARACTER_ABILITY_SUMMARY_MAX_LENGTH} characters or fewer.`,
      };
    }

    if (trigger.length > CHARACTER_ABILITY_TRIGGER_MAX_LENGTH) {
      return {
        abilities: [],
        error: `Ability trigger on line ${index + 1} must be ${CHARACTER_ABILITY_TRIGGER_MAX_LENGTH} characters or fewer.`,
      };
    }

    abilities.push({ name, summary, trigger });
  }

  return {
    abilities,
    error: null,
  };
}

function validateShortField(
  value: string,
  field: "ancestry" | "background" | "className",
  fieldErrors: CharacterFieldErrors,
) {
  if (value.length > CHARACTER_SHORT_FIELD_MAX_LENGTH) {
    fieldErrors[field] =
      `Keep this field to ${CHARACTER_SHORT_FIELD_MAX_LENGTH} characters or fewer.`;
  }
}

function normalizeVisibility(value: string): Visibility | null {
  return visibilities.includes(value as Visibility) ? (value as Visibility) : null;
}

function createValidationState(
  validation: ReturnType<typeof validateCharacterValues>,
): CharacterActionState {
  return {
    fieldErrors: validation.fieldErrors,
    formError: null,
    successMessage: null,
    values: validation.values,
  };
}

function hasFieldErrors(fieldErrors: CharacterFieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}
