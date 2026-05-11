export type AppEnvironment = "local" | "preview" | "production";
export type AuthProvider = "local";
export type GroundingMode = "disabled" | "local" | "retrieval";
export type LogLevel = "debug" | "error" | "info" | "warn";
export type ObservabilityProvider = "console" | "sentry";
export type StorageProvider = "none" | "vercel-blob";

export type EnvSource = Record<string, string | undefined>;

export type PublicEnv = {
  NEXT_PUBLIC_APP_ENV: AppEnvironment;
  NEXT_PUBLIC_SENTRY_DSN?: string;
};

export type ServerEnv = {
  AI_GROUNDING_MODE: GroundingMode;
  AUTH_PROVIDER: AuthProvider;
  AUTH_SESSION_SECRET?: string;
  BLOB_READ_WRITE_TOKEN?: string;
  DATABASE_CONNECTION_TIMEOUT_MS?: string;
  DATABASE_IDLE_TIMEOUT_MS?: string;
  DATABASE_POOL_MAX?: string;
  DATABASE_URL?: string;
  LOG_LEVEL: LogLevel;
  OBSERVABILITY_PROVIDER: ObservabilityProvider;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  SENTRY_DSN?: string;
  STORAGE_PROVIDER: StorageProvider;
  VERCEL_ENV?: string;
};

export type RuntimeEnvValidationIssue = {
  key: string;
  message: string;
};

const appEnvironments = ["local", "preview", "production"] as const;
const authProviders = ["local"] as const;
const groundingModes = ["disabled", "local", "retrieval"] as const;
const logLevels = ["debug", "error", "info", "warn"] as const;
const observabilityProviders = ["console", "sentry"] as const;
const storageProviders = ["none", "vercel-blob"] as const;
const nonLocalAppEnvironments = new Set<AppEnvironment>(["preview", "production"]);
const postgresProtocols = new Set(["postgres:", "postgresql:"]);

export function readPublicEnv(source: EnvSource): PublicEnv {
  return {
    NEXT_PUBLIC_APP_ENV: pickValue(
      source.NEXT_PUBLIC_APP_ENV,
      appEnvironments,
      inferAppEnvironment(source),
    ),
    NEXT_PUBLIC_SENTRY_DSN: emptyToUndefined(source.NEXT_PUBLIC_SENTRY_DSN),
  };
}

export function readServerEnv(source: EnvSource): ServerEnv {
  return {
    AI_GROUNDING_MODE: pickValue(source.AI_GROUNDING_MODE, groundingModes, "disabled"),
    AUTH_PROVIDER: pickValue(source.AUTH_PROVIDER, authProviders, "local"),
    AUTH_SESSION_SECRET: emptyToUndefined(source.AUTH_SESSION_SECRET),
    BLOB_READ_WRITE_TOKEN: emptyToUndefined(source.BLOB_READ_WRITE_TOKEN),
    DATABASE_CONNECTION_TIMEOUT_MS: emptyToUndefined(source.DATABASE_CONNECTION_TIMEOUT_MS),
    DATABASE_IDLE_TIMEOUT_MS: emptyToUndefined(source.DATABASE_IDLE_TIMEOUT_MS),
    DATABASE_POOL_MAX: emptyToUndefined(source.DATABASE_POOL_MAX),
    DATABASE_URL: emptyToUndefined(source.DATABASE_URL),
    LOG_LEVEL: pickValue(source.LOG_LEVEL, logLevels, "info"),
    OBSERVABILITY_PROVIDER: pickValue(
      source.OBSERVABILITY_PROVIDER,
      observabilityProviders,
      "console",
    ),
    OPENAI_API_KEY: emptyToUndefined(source.OPENAI_API_KEY),
    OPENAI_MODEL: emptyToUndefined(source.OPENAI_MODEL),
    SENTRY_DSN: emptyToUndefined(source.SENTRY_DSN),
    STORAGE_PROVIDER: pickValue(source.STORAGE_PROVIDER, storageProviders, "none"),
    VERCEL_ENV: emptyToUndefined(source.VERCEL_ENV),
  };
}

export function isNonLocalAppEnvironment(appEnvironment: AppEnvironment) {
  return nonLocalAppEnvironments.has(appEnvironment);
}

export function validateRuntimeEnv(source: EnvSource): RuntimeEnvValidationIssue[] {
  const issues: RuntimeEnvValidationIssue[] = [];

  validateEnumValue("NEXT_PUBLIC_APP_ENV", source.NEXT_PUBLIC_APP_ENV, appEnvironments, issues);
  validateEnumValue("AUTH_PROVIDER", source.AUTH_PROVIDER, authProviders, issues);
  validateEnumValue("AI_GROUNDING_MODE", source.AI_GROUNDING_MODE, groundingModes, issues);
  validateEnumValue("LOG_LEVEL", source.LOG_LEVEL, logLevels, issues);
  validateEnumValue(
    "OBSERVABILITY_PROVIDER",
    source.OBSERVABILITY_PROVIDER,
    observabilityProviders,
    issues,
  );
  validateEnumValue("STORAGE_PROVIDER", source.STORAGE_PROVIDER, storageProviders, issues);
  validateVercelEnvironment(source, issues);

  const publicEnv = readPublicEnv(source);
  const serverEnv = readServerEnv(source);

  if (isNonLocalAppEnvironment(publicEnv.NEXT_PUBLIC_APP_ENV)) {
    requireValue("DATABASE_URL", serverEnv.DATABASE_URL, issues);
    requireValue("AUTH_SESSION_SECRET", serverEnv.AUTH_SESSION_SECRET, issues);
  }

  if (
    serverEnv.AUTH_SESSION_SECRET &&
    serverEnv.AUTH_SESSION_SECRET.trim().length < 32
  ) {
    issues.push({
      key: "AUTH_SESSION_SECRET",
      message: "AUTH_SESSION_SECRET must be at least 32 characters long.",
    });
  }

  if (serverEnv.DATABASE_URL) {
    validatePostgresUrl("DATABASE_URL", serverEnv.DATABASE_URL, issues);
  }

  validateOptionalPositiveInteger(
    "DATABASE_POOL_MAX",
    serverEnv.DATABASE_POOL_MAX,
    issues,
  );
  validateOptionalPositiveInteger(
    "DATABASE_CONNECTION_TIMEOUT_MS",
    serverEnv.DATABASE_CONNECTION_TIMEOUT_MS,
    issues,
  );
  validateOptionalPositiveInteger(
    "DATABASE_IDLE_TIMEOUT_MS",
    serverEnv.DATABASE_IDLE_TIMEOUT_MS,
    issues,
  );

  if (serverEnv.AI_GROUNDING_MODE === "retrieval") {
    requireValue("OPENAI_API_KEY", serverEnv.OPENAI_API_KEY, issues);
  }

  if (serverEnv.OBSERVABILITY_PROVIDER === "sentry") {
    requireValue("SENTRY_DSN", serverEnv.SENTRY_DSN, issues);
  }

  if (serverEnv.SENTRY_DSN) {
    validateUrl("SENTRY_DSN", serverEnv.SENTRY_DSN, issues);
  }

  if (publicEnv.NEXT_PUBLIC_SENTRY_DSN) {
    validateUrl("NEXT_PUBLIC_SENTRY_DSN", publicEnv.NEXT_PUBLIC_SENTRY_DSN, issues);
  }

  if (serverEnv.STORAGE_PROVIDER === "vercel-blob") {
    requireValue("BLOB_READ_WRITE_TOKEN", serverEnv.BLOB_READ_WRITE_TOKEN, issues);
  }

  return issues;
}

export function assertValidRuntimeEnv(source: EnvSource) {
  const issues = validateRuntimeEnv(source);

  if (issues.length > 0) {
    throw new Error(formatRuntimeEnvValidationIssues(issues));
  }
}

export function formatRuntimeEnvValidationIssues(
  issues: RuntimeEnvValidationIssue[],
) {
  return [
    "Runtime environment validation failed:",
    ...issues.map((issue) => `- ${issue.key}: ${issue.message}`),
  ].join("\n");
}

function emptyToUndefined(value: string | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : undefined;
}

function inferAppEnvironment(source: EnvSource): AppEnvironment {
  if (source.VERCEL_ENV === "production") {
    return "production";
  }

  if (source.VERCEL_ENV === "preview") {
    return "preview";
  }

  return "local";
}

function pickValue<const TValue extends string>(
  value: string | undefined,
  allowed: readonly TValue[],
  fallback: TValue,
): TValue {
  const normalizedValue = emptyToUndefined(value);

  if (normalizedValue && allowed.includes(normalizedValue as TValue)) {
    return normalizedValue as TValue;
  }

  return fallback;
}

function requireValue(
  key: string,
  value: string | undefined,
  issues: RuntimeEnvValidationIssue[],
) {
  if (!value || value.trim().length === 0) {
    issues.push({
      key,
      message: `${key} is required for this environment.`,
    });
  }
}

function validateEnumValue<const TValue extends string>(
  key: string,
  value: string | undefined,
  allowed: readonly TValue[],
  issues: RuntimeEnvValidationIssue[],
) {
  const normalizedValue = emptyToUndefined(value);

  if (normalizedValue && !allowed.includes(normalizedValue as TValue)) {
    issues.push({
      key,
      message: `${key} must be one of: ${allowed.join(", ")}.`,
    });
  }
}

function validateVercelEnvironment(
  source: EnvSource,
  issues: RuntimeEnvValidationIssue[],
) {
  const inferredEnvironment = inferAppEnvironment(source);
  const explicitEnvironment = emptyToUndefined(source.NEXT_PUBLIC_APP_ENV);

  if (
    inferredEnvironment !== "local" &&
    explicitEnvironment &&
    explicitEnvironment !== inferredEnvironment
  ) {
    issues.push({
      key: "NEXT_PUBLIC_APP_ENV",
      message: `NEXT_PUBLIC_APP_ENV must match VERCEL_ENV=${source.VERCEL_ENV}.`,
    });
  }
}

function validatePostgresUrl(
  key: string,
  value: string,
  issues: RuntimeEnvValidationIssue[],
) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    issues.push({
      key,
      message: `${key} must be a valid Postgres connection string.`,
    });
    return;
  }

  if (!postgresProtocols.has(parsedUrl.protocol)) {
    issues.push({
      key,
      message: `${key} must start with postgres:// or postgresql://.`,
    });
  }

  if (hasPlaceholderSecret(parsedUrl.password)) {
    issues.push({
      key,
      message: `${key} must replace the placeholder database password before use.`,
    });
  }

  if (isSupabasePostgresHost(parsedUrl.hostname) && !hasRequiredSslMode(parsedUrl)) {
    issues.push({
      key,
      message: `${key} for Supabase must include sslmode=require, sslmode=verify-ca, or sslmode=verify-full.`,
    });
  }
}

function validateUrl(
  key: string,
  value: string,
  issues: RuntimeEnvValidationIssue[],
) {
  try {
    new URL(value);
  } catch {
    issues.push({
      key,
      message: `${key} must be a valid URL.`,
    });
  }
}

function validateOptionalPositiveInteger(
  key: string,
  value: string | undefined,
  issues: RuntimeEnvValidationIssue[],
) {
  if (!value) {
    return;
  }

  if (!/^\d+$/u.test(value) || Number(value) <= 0) {
    issues.push({
      key,
      message: `${key} must be a positive integer.`,
    });
  }
}

function hasPlaceholderSecret(value: string) {
  const normalizedValue = value.toLowerCase();

  return (
    normalizedValue.includes("replace_with") ||
    normalizedValue.includes("your-password") ||
    normalizedValue.includes("your_password")
  );
}

function isSupabasePostgresHost(hostname: string) {
  return (
    hostname.endsWith(".supabase.co") ||
    hostname.endsWith(".pooler.supabase.com")
  );
}

function hasRequiredSslMode(parsedUrl: URL) {
  const sslMode = parsedUrl.searchParams.get("sslmode");

  return sslMode === "require" || sslMode === "verify-ca" || sslMode === "verify-full";
}

