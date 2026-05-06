import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const appEnvironments = ["local", "preview", "production"];
const authProviders = ["local"];
const groundingModes = ["disabled", "local", "retrieval"];
const logLevels = ["debug", "error", "info", "warn"];
const observabilityProviders = ["console", "sentry"];
const storageProviders = ["none", "vercel-blob"];
const databaseProtocols = new Set(["postgres:", "postgresql:"]);
const envFiles = [".env", ".env.local", "apps/web/.env.local"];

const options = parseOptions(process.argv.slice(2));
const env = loadEnvFiles({ ...process.env });

if (options.targetEnvironment) {
  env.NEXT_PUBLIC_APP_ENV = options.targetEnvironment;
}

const issues = validateEnvironment(env, options);
const resolvedEnvironment = pickValue(
  env.NEXT_PUBLIC_APP_ENV,
  appEnvironments,
  inferAppEnvironment(env),
);

if (issues.length > 0) {
  console.error("Production integration environment check failed:");
  for (const issue of issues) {
    console.error(`- ${issue.key}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(
  `Production integration environment check passed for ${resolvedEnvironment}.`,
);

function validateEnvironment(source, { strict }) {
  const issues = [];
  const appEnvironment = pickValue(
    source.NEXT_PUBLIC_APP_ENV,
    appEnvironments,
    inferAppEnvironment(source),
  );
  const groundingMode = pickValue(source.AI_GROUNDING_MODE, groundingModes, "disabled");
  const observabilityProvider = pickValue(
    source.OBSERVABILITY_PROVIDER,
    observabilityProviders,
    "console",
  );
  const storageProvider = pickValue(source.STORAGE_PROVIDER, storageProviders, "none");

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

  if (appEnvironment !== "local") {
    requireValue("DATABASE_URL", source.DATABASE_URL, issues);
    requireValue("AUTH_SESSION_SECRET", source.AUTH_SESSION_SECRET, issues);
  }

  if (readValue(source.AUTH_SESSION_SECRET).length > 0) {
    validateMinimumLength("AUTH_SESSION_SECRET", source.AUTH_SESSION_SECRET, 32, issues);
  }

  if (readValue(source.DATABASE_URL).length > 0) {
    validatePostgresUrl("DATABASE_URL", source.DATABASE_URL, issues);
  }

  if (groundingMode === "retrieval" || strict) {
    requireValue("OPENAI_API_KEY", source.OPENAI_API_KEY, issues);
  }

  if (observabilityProvider === "sentry") {
    requireValue("SENTRY_DSN", source.SENTRY_DSN, issues);
  }

  if (readValue(source.SENTRY_DSN).length > 0) {
    validateUrl("SENTRY_DSN", source.SENTRY_DSN, issues);
  }

  if (readValue(source.NEXT_PUBLIC_SENTRY_DSN).length > 0) {
    validateUrl("NEXT_PUBLIC_SENTRY_DSN", source.NEXT_PUBLIC_SENTRY_DSN, issues);
  }

  if (storageProvider === "vercel-blob") {
    requireValue("BLOB_READ_WRITE_TOKEN", source.BLOB_READ_WRITE_TOKEN, issues);
  }

  return issues;
}

function parseOptions(args) {
  const targetEnvironment = readOption(args, "--env");

  if (targetEnvironment && !appEnvironments.includes(targetEnvironment)) {
    throw new Error(`--env must be one of: ${appEnvironments.join(", ")}`);
  }

  return {
    strict: args.includes("--strict"),
    targetEnvironment,
  };
}

function readOption(args, name) {
  const assignment = args.find((arg) => arg.startsWith(`${name}=`));

  if (assignment) {
    return assignment.slice(name.length + 1);
  }

  const index = args.indexOf(name);

  if (index >= 0) {
    return args[index + 1];
  }

  return undefined;
}

function loadEnvFiles(target) {
  for (const relativePath of envFiles) {
    const absolutePath = join(process.cwd(), relativePath);

    if (!existsSync(absolutePath)) {
      continue;
    }

    const fileContents = readFileSync(absolutePath, "utf8");

    for (const [key, value] of parseEnvFile(fileContents)) {
      if (target[key] === undefined) {
        target[key] = value;
      }
    }
  }

  return target;
}

function parseEnvFile(fileContents) {
  const entries = [];

  for (const rawLine of fileContents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripOptionalQuotes(line.slice(separatorIndex + 1).trim());

    entries.push([key, value]);
  }

  return entries;
}

function stripOptionalQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function pickValue(value, allowed, fallback) {
  const normalizedValue = readValue(value);

  if (allowed.includes(normalizedValue)) {
    return normalizedValue;
  }

  return fallback;
}

function inferAppEnvironment(source) {
  if (source.VERCEL_ENV === "production") {
    return "production";
  }

  if (source.VERCEL_ENV === "preview") {
    return "preview";
  }

  return "local";
}

function readValue(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function requireValue(key, value, issues) {
  if (readValue(value).length === 0) {
    issues.push({
      key,
      message: `${key} is required for this environment.`,
    });
  }
}

function validateEnumValue(key, value, allowed, issues) {
  const normalizedValue = readValue(value);

  if (normalizedValue.length > 0 && !allowed.includes(normalizedValue)) {
    issues.push({
      key,
      message: `${key} must be one of: ${allowed.join(", ")}.`,
    });
  }
}

function validateVercelEnvironment(source, issues) {
  const inferredEnvironment = inferAppEnvironment(source);
  const explicitEnvironment = readValue(source.NEXT_PUBLIC_APP_ENV);

  if (
    inferredEnvironment !== "local" &&
    explicitEnvironment.length > 0 &&
    explicitEnvironment !== inferredEnvironment
  ) {
    issues.push({
      key: "NEXT_PUBLIC_APP_ENV",
      message: `NEXT_PUBLIC_APP_ENV must match VERCEL_ENV=${source.VERCEL_ENV}.`,
    });
  }
}

function validateMinimumLength(key, value, minimumLength, issues) {
  if (readValue(value).length < minimumLength) {
    issues.push({
      key,
      message: `${key} must be at least ${minimumLength} characters long.`,
    });
  }
}

function validatePostgresUrl(key, value, issues) {
  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    issues.push({
      key,
      message: `${key} must be a valid Postgres connection string.`,
    });
    return;
  }

  if (!databaseProtocols.has(parsedUrl.protocol)) {
    issues.push({
      key,
      message: `${key} must start with postgres:// or postgresql://.`,
    });
  }
}

function validateUrl(key, value, issues) {
  try {
    new URL(value);
  } catch {
    issues.push({
      key,
      message: `${key} must be a valid URL.`,
    });
  }
}
