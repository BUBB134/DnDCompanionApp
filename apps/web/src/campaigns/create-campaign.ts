import type { AuthUser, Campaign } from "@dnd/types";

const CAMPAIGN_NAME_MAX_LENGTH = 80;
const CAMPAIGN_SUMMARY_MAX_LENGTH = 500;

export type CreateCampaignValues = {
  name: string;
  summary: string;
};

export type NormalizedCreateCampaignInput = {
  name: string;
  summary: string | null;
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
    name: "",
    summary: "",
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
    name: values.name.trim(),
    summary: values.summary.trim(),
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

  return {
    fieldErrors,
    input: {
      name: normalizedValues.name,
      summary: normalizedValues.summary || null,
    } satisfies NormalizedCreateCampaignInput,
    values: normalizedValues,
  };
}

function hasFieldErrors(fieldErrors: CreateCampaignFieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}
