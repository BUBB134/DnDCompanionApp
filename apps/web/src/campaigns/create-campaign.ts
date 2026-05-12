import type { AuthUser, Campaign } from "@dnd/types";

const CAMPAIGN_NAME_MAX_LENGTH = 80;
const CAMPAIGN_SUMMARY_MAX_LENGTH = 500;
const CAMPAIGN_RULESET_MAX_LENGTH = 80;
const CAMPAIGN_TONE_MAX_LENGTH = 80;
const CAMPAIGN_STARTING_LOCATION_MAX_LENGTH = 120;
const CAMPAIGN_OPENING_HOOK_MAX_LENGTH = 180;
const CAMPAIGN_FIRST_SESSION_TITLE_MAX_LENGTH = 120;
export const DEFAULT_CAMPAIGN_RULESET = "D&D 5e";
export const DEFAULT_CAMPAIGN_TONE = "Heroic fantasy";
export const DEFAULT_FIRST_SESSION_TITLE = "Session zero";

export type CreateCampaignValues = {
  firstSessionTitle: string;
  name: string;
  openingHook: string;
  ruleset: string;
  startingLocation: string;
  summary: string;
  tone: string;
};

export type NormalizedCreateCampaignInput = {
  firstSessionTitle: string | null;
  name: string;
  openingHook: string | null;
  ruleset: string;
  startingLocation: string | null;
  summary: string | null;
  tone: string | null;
};

export type CreateCampaignFieldErrors = Partial<
  Record<keyof CreateCampaignValues, string>
>;

export type CreateCampaignActionState = {
  fieldErrors: CreateCampaignFieldErrors;
  formError: string | null;
  values: CreateCampaignValues;
};

type CampaignCreator = {
  createCampaignForUser(
    user: AuthUser,
    input: NormalizedCreateCampaignInput,
  ): Promise<Campaign>;
};

type CreateCampaignSubmissionResult =
  | {
      campaign: Campaign;
      ok: true;
    }
  | {
      ok: false;
      state: CreateCampaignActionState;
    };

export const initialCreateCampaignActionState: CreateCampaignActionState = {
  fieldErrors: {},
  formError: null,
  values: {
    firstSessionTitle: DEFAULT_FIRST_SESSION_TITLE,
    name: "",
    openingHook: "",
    ruleset: DEFAULT_CAMPAIGN_RULESET,
    startingLocation: "",
    summary: "",
    tone: DEFAULT_CAMPAIGN_TONE,
  },
};

export async function createCampaignSubmission(
  creator: CampaignCreator,
  user: AuthUser,
  values: CreateCampaignValues,
  formatError: (error: unknown) => string,
): Promise<CreateCampaignSubmissionResult> {
  const validation = validateCreateCampaignValues(values);

  if (hasFieldErrors(validation.fieldErrors)) {
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
    const campaign = await creator.createCampaignForUser(user, validation.input);

    return {
      campaign,
      ok: true,
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

export function validateCreateCampaignValues(values: CreateCampaignValues) {
  const normalizedValues = {
    firstSessionTitle: normalizeTextValue(values.firstSessionTitle),
    name: normalizeTextValue(values.name),
    openingHook: normalizeTextValue(values.openingHook),
    ruleset:
      normalizeTextValue(values.ruleset) || DEFAULT_CAMPAIGN_RULESET,
    startingLocation: normalizeTextValue(values.startingLocation),
    summary: normalizeTextValue(values.summary),
    tone: normalizeTextValue(values.tone),
  };
  const fieldErrors: CreateCampaignFieldErrors = {};

  if (normalizedValues.name.length === 0) {
    fieldErrors.name = "Campaign name is required.";
  } else if (normalizedValues.name.length > CAMPAIGN_NAME_MAX_LENGTH) {
    fieldErrors.name = `Campaign name must be ${CAMPAIGN_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (normalizedValues.summary.length > CAMPAIGN_SUMMARY_MAX_LENGTH) {
    fieldErrors.summary =
      `Campaign summary must be ${CAMPAIGN_SUMMARY_MAX_LENGTH} characters or fewer.`;
  }

  if (normalizedValues.ruleset.length > CAMPAIGN_RULESET_MAX_LENGTH) {
    fieldErrors.ruleset =
      `Ruleset must be ${CAMPAIGN_RULESET_MAX_LENGTH} characters or fewer.`;
  }

  if (normalizedValues.tone.length > CAMPAIGN_TONE_MAX_LENGTH) {
    fieldErrors.tone =
      `Tone must be ${CAMPAIGN_TONE_MAX_LENGTH} characters or fewer.`;
  }

  if (
    normalizedValues.startingLocation.length >
    CAMPAIGN_STARTING_LOCATION_MAX_LENGTH
  ) {
    fieldErrors.startingLocation =
      `Starting location must be ${CAMPAIGN_STARTING_LOCATION_MAX_LENGTH} characters or fewer.`;
  }

  if (normalizedValues.openingHook.length > CAMPAIGN_OPENING_HOOK_MAX_LENGTH) {
    fieldErrors.openingHook =
      `Opening hook must be ${CAMPAIGN_OPENING_HOOK_MAX_LENGTH} characters or fewer.`;
  }

  if (
    normalizedValues.firstSessionTitle.length >
    CAMPAIGN_FIRST_SESSION_TITLE_MAX_LENGTH
  ) {
    fieldErrors.firstSessionTitle =
      `First session title must be ${CAMPAIGN_FIRST_SESSION_TITLE_MAX_LENGTH} characters or fewer.`;
  }

  return {
    fieldErrors,
    input: {
      firstSessionTitle: normalizedValues.firstSessionTitle || null,
      name: normalizedValues.name,
      openingHook: normalizedValues.openingHook || null,
      ruleset: normalizedValues.ruleset,
      startingLocation: normalizedValues.startingLocation || null,
      summary: normalizedValues.summary || null,
      tone: normalizedValues.tone || null,
    } satisfies NormalizedCreateCampaignInput,
    values: normalizedValues,
  };
}

function hasFieldErrors(fieldErrors: CreateCampaignFieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}

function normalizeTextValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
