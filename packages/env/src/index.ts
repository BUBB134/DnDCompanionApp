export type AppEnvironment = "local" | "preview" | "production";
export type GroundingMode = "disabled" | "local" | "retrieval";

export type EnvSource = Record<string, string | undefined>;

export type PublicEnv = {
  NEXT_PUBLIC_APP_ENV: AppEnvironment;
};

export type ServerEnv = {
  AI_GROUNDING_MODE: GroundingMode;
  DATABASE_URL?: string;
  OPENAI_API_KEY?: string;
};

const appEnvironments = ["local", "preview", "production"] as const;
const groundingModes = ["disabled", "local", "retrieval"] as const;

export function readPublicEnv(source: EnvSource): PublicEnv {
  return {
    NEXT_PUBLIC_APP_ENV: pickValue(
      source.NEXT_PUBLIC_APP_ENV,
      appEnvironments,
      "local",
    ),
  };
}

export function readServerEnv(source: EnvSource): ServerEnv {
  return {
    AI_GROUNDING_MODE: pickValue(source.AI_GROUNDING_MODE, groundingModes, "disabled"),
    DATABASE_URL: emptyToUndefined(source.DATABASE_URL),
    OPENAI_API_KEY: emptyToUndefined(source.OPENAI_API_KEY),
  };
}

function emptyToUndefined(value: string | undefined) {
  return value && value.trim().length > 0 ? value : undefined;
}

function pickValue<const TValue extends string>(
  value: string | undefined,
  allowed: readonly TValue[],
  fallback: TValue,
): TValue {
  if (value && allowed.includes(value as TValue)) {
    return value as TValue;
  }

  return fallback;
}

