import type {
  CampaignCharacterFullView,
  CharacterLevelProgressionFeature,
} from "@dnd/types";
import { isDatabaseCampaignId, isDatabaseId } from "@/campaigns/database-id";

const LEVEL_UP_SUMMARY_MAX_LENGTH = 1000;
const LEVEL_UP_FEATURE_MAX_COUNT = 6;
const LEVEL_UP_FEATURE_NAME_MAX_LENGTH = 80;
const LEVEL_UP_FEATURE_SUMMARY_MAX_LENGTH = 280;
const LEVEL_UP_FEATURE_TRIGGER_MAX_LENGTH = 160;

export type LevelUpFormValues = {
  abilities: string;
  campaignId: string;
  characterId: string;
  currentLevel: string;
  revision: string;
  summary: string;
};

export type LevelUpFieldErrors = Partial<
  Record<keyof LevelUpFormValues, string>
>;

export type LevelUpActionState = {
  fieldErrors: LevelUpFieldErrors;
  formError: string | null;
  values: LevelUpFormValues;
};

export type CharacterLevelUpInput = {
  abilities: CharacterLevelProgressionFeature[];
  campaignId: string;
  characterId: string;
  currentLevel: number;
  expectedRevision: string;
  summary: string;
  targetLevel: number;
};

type LevelUpRepository = {
  completeCharacterLevelUpForUser(
    userId: string,
    input: CharacterLevelUpInput,
  ): Promise<CampaignCharacterFullView>;
};

type LevelUpSubmissionResult =
  | {
      character: CampaignCharacterFullView;
      ok: true;
      state: LevelUpActionState;
    }
  | {
      ok: false;
      state: LevelUpActionState;
    };

export const emptyLevelUpFormValues: LevelUpFormValues = {
  abilities: "",
  campaignId: "",
  characterId: "",
  currentLevel: "",
  revision: "",
  summary: "",
};

export function createLevelUpActionState(
  values: Partial<LevelUpFormValues> = {},
): LevelUpActionState {
  return {
    fieldErrors: {},
    formError: null,
    values: {
      ...emptyLevelUpFormValues,
      ...values,
    },
  };
}

export async function completeLevelUpSubmission(
  repository: LevelUpRepository,
  userId: string,
  character: CampaignCharacterFullView,
  values: LevelUpFormValues,
  formatError: (error: unknown) => string,
): Promise<LevelUpSubmissionResult> {
  const validation = validateLevelUpValues(values, character);

  if (Object.keys(validation.fieldErrors).length > 0) {
    return {
      ok: false,
      state: {
        fieldErrors: validation.fieldErrors,
        formError: null,
        values: validation.values,
      },
    };
  }

  try {
    const updatedCharacter =
      await repository.completeCharacterLevelUpForUser(
        userId,
        validation.input,
      );

    return {
      character: updatedCharacter,
      ok: true,
      state: createLevelUpActionState({
        campaignId: validation.input.campaignId,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      state: {
        fieldErrors: {},
        formError: formatError(error),
        values: validation.values,
      },
    };
  }
}

export function validateLevelUpValues(
  values: LevelUpFormValues,
  character: CampaignCharacterFullView,
) {
  const normalizedValues = {
    abilities: values.abilities.trim(),
    campaignId: values.campaignId.trim(),
    characterId: values.characterId.trim(),
    currentLevel: values.currentLevel.trim(),
    revision: values.revision.trim(),
    summary: values.summary.trim(),
  };
  const fieldErrors: LevelUpFieldErrors = {};
  const currentLevel = Number(normalizedValues.currentLevel);
  const abilityResult = parseLevelUpFeatures(normalizedValues.abilities);

  if (!isDatabaseCampaignId(normalizedValues.campaignId)) {
    fieldErrors.campaignId = "Open a saved campaign before levelling up.";
  }

  if (!isDatabaseId(normalizedValues.characterId)) {
    fieldErrors.characterId = "A saved character is required.";
  } else if (normalizedValues.characterId !== character.id) {
    fieldErrors.characterId = "Reload this character before levelling up.";
  }

  if (
    !Number.isInteger(currentLevel) ||
    currentLevel !== character.level
  ) {
    fieldErrors.currentLevel =
      "This character changed after the level-up flow opened. Reload and try again.";
  } else if (currentLevel >= 20) {
    fieldErrors.currentLevel = "This character is already level 20.";
  }

  if (
    !normalizedValues.revision ||
    Number.isNaN(Date.parse(normalizedValues.revision))
  ) {
    fieldErrors.revision =
      "Reload this character before completing the level-up.";
  }

  if (!normalizedValues.summary) {
    fieldErrors.summary =
      "Describe the most meaningful change from this level.";
  } else if (
    normalizedValues.summary.length > LEVEL_UP_SUMMARY_MAX_LENGTH
  ) {
    fieldErrors.summary =
      `Keep the level-up summary to ${LEVEL_UP_SUMMARY_MAX_LENGTH} characters or fewer.`;
  }

  if (abilityResult.error) {
    fieldErrors.abilities = abilityResult.error;
  }

  return {
    fieldErrors,
    input: {
      abilities: abilityResult.features,
      campaignId: normalizedValues.campaignId,
      characterId: normalizedValues.characterId,
      currentLevel: Number.isInteger(currentLevel)
        ? currentLevel
        : character.level,
      expectedRevision: normalizedValues.revision,
      summary: normalizedValues.summary,
      targetLevel: character.level + 1,
    } satisfies CharacterLevelUpInput,
    values: normalizedValues,
  };
}

export function parseLevelUpFeatures(value: string): {
  error: string | null;
  features: CharacterLevelProgressionFeature[];
} {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      error: "Add at least one new feature or ability reminder.",
      features: [],
    };
  }

  if (lines.length > LEVEL_UP_FEATURE_MAX_COUNT) {
    return {
      error: `Add ${LEVEL_UP_FEATURE_MAX_COUNT} new features or fewer.`,
      features: [],
    };
  }

  const features: CharacterLevelProgressionFeature[] = [];

  for (const [index, line] of lines.entries()) {
    const [name = "", summary = "", trigger = "", ...extra] = line
      .split("|")
      .map((part) => part.trim());

    if (extra.length > 0 || !name || !summary) {
      return {
        error: `Feature line ${index + 1} must use Name | Summary | Optional trigger.`,
        features: [],
      };
    }

    if (name.length > LEVEL_UP_FEATURE_NAME_MAX_LENGTH) {
      return {
        error: `Feature name on line ${index + 1} must be ${LEVEL_UP_FEATURE_NAME_MAX_LENGTH} characters or fewer.`,
        features: [],
      };
    }

    if (summary.length > LEVEL_UP_FEATURE_SUMMARY_MAX_LENGTH) {
      return {
        error: `Feature summary on line ${index + 1} must be ${LEVEL_UP_FEATURE_SUMMARY_MAX_LENGTH} characters or fewer.`,
        features: [],
      };
    }

    if (trigger.length > LEVEL_UP_FEATURE_TRIGGER_MAX_LENGTH) {
      return {
        error: `Feature trigger on line ${index + 1} must be ${LEVEL_UP_FEATURE_TRIGGER_MAX_LENGTH} characters or fewer.`,
        features: [],
      };
    }

    features.push({
      name,
      summary,
      trigger: trigger || null,
    });
  }

  return {
    error: null,
    features,
  };
}
