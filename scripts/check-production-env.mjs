import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const appEnvironments = ["local", "preview", "production"];
const authProviders = ["local", "clerk"];
const groundingModes = ["disabled", "local", "retrieval"];
const logLevels = ["debug", "error", "info", "warn"];
const observabilityProviders = ["console", "sentry"];
const storageProviders = ["none", "vercel-blob"];
const databaseProtocols = new Set(["postgres:", "postgresql:"]);
const secureSslModes = new Set(["require", "verify-ca", "verify-full"]);
const defaultSupabaseProjectRef = "egrmvhfroiumcodkotjv";
const supabasePoolerHostSuffix = ".pooler.supabase.com";
const supabaseAnonKeyPrefixes = ["sb_publishable_"];
const supabaseServiceKeyPrefixes = ["sb_secret_"];
const clerkPublishableKeyPrefixes = ["pk_test_", "pk_live_"];
const clerkSecretKeyPrefixes = ["sk_test_", "sk_live_"];
const productionAppOrigin = "https://thedndcompanion.com";
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

function validateEnvironment(source, { requireSupabase, strict, supabaseProject }) {
  const issues = [];
  const appEnvironment = pickValue(
    source.NEXT_PUBLIC_APP_ENV,
    appEnvironments,
    inferAppEnvironment(source),
  );
  const authProvider = pickValue(source.AUTH_PROVIDER, authProviders, "local");
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

  if (appEnvironment !== "local" || requireSupabase) {
    requireValue("DATABASE_URL", source.DATABASE_URL, issues);
  }

  if (appEnvironment !== "local") {
    requireValue("APP_BASE_URL", source.APP_BASE_URL, issues);
    requireValue(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      source.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      issues,
    );
    requireValue("CLERK_SECRET_KEY", source.CLERK_SECRET_KEY, issues);

    if (authProvider !== "clerk") {
      issues.push({
        key: "AUTH_PROVIDER",
        message: "AUTH_PROVIDER must be clerk in preview and production.",
      });
    }
  }

  if (authProvider === "clerk") {
    requireValue(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      source.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      issues,
    );
    requireValue("CLERK_SECRET_KEY", source.CLERK_SECRET_KEY, issues);
  }

  if (strict) {
    requireValue("APP_BASE_URL", source.APP_BASE_URL, issues);
    requireValue(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      source.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      issues,
    );
    requireValue("CLERK_SECRET_KEY", source.CLERK_SECRET_KEY, issues);
  }

  if (readValue(source.APP_BASE_URL).length > 0) {
    validateAppBaseUrl("APP_BASE_URL", source.APP_BASE_URL, appEnvironment, issues);
  }

  if (readValue(source.AUTH_SESSION_SECRET).length > 0) {
    validateMinimumLength("AUTH_SESSION_SECRET", source.AUTH_SESSION_SECRET, 32, issues);
  }

  if (readValue(source.DATABASE_URL).length > 0) {
    validatePostgresUrl(
      "DATABASE_URL",
      source.DATABASE_URL,
      appEnvironment,
      supabaseProject,
      requireSupabase,
      issues,
    );
  }
  if (readValue(source.NEXT_PUBLIC_SUPABASE_URL).length > 0) {
    validateSupabaseProjectUrl(
      "NEXT_PUBLIC_SUPABASE_URL",
      source.NEXT_PUBLIC_SUPABASE_URL,
      supabaseProject,
      issues,
    );
  }
  validateSupabaseKey(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseAnonKeyPrefixes,
    "a Supabase anon JWT or publishable key",
    issues,
  );
  validateClerkKey(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    source.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    clerkPublishableKeyPrefixes,
    appEnvironment === "production" ? "pk_live_" : undefined,
    issues,
  );
  validateClerkKey(
    "CLERK_SECRET_KEY",
    source.CLERK_SECRET_KEY,
    clerkSecretKeyPrefixes,
    appEnvironment === "production" ? "sk_live_" : undefined,
    issues,
  );
  validateSupabaseKey(
    "SUPABASE_SERVICE_ROLE_KEY",
    source.SUPABASE_SERVICE_ROLE_KEY,
    supabaseServiceKeyPrefixes,
    "a Supabase service-role JWT or secret key",
    issues,
  );
  validateOptionalPositiveInteger("DATABASE_POOL_MAX", source.DATABASE_POOL_MAX, issues);
  validateOptionalPositiveInteger(
    "DATABASE_CONNECTION_TIMEOUT_MS",
    source.DATABASE_CONNECTION_TIMEOUT_MS,
    issues,
  );
  validateOptionalPositiveInteger(
    "DATABASE_IDLE_TIMEOUT_MS",
    source.DATABASE_IDLE_TIMEOUT_MS,
    issues,
  );

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
  const supabaseProject = readOption(args, "--supabase-project") ?? defaultSupabaseProjectRef;

  if (targetEnvironment && !appEnvironments.includes(targetEnvironment)) {
    throw new Error(`--env must be one of: ${appEnvironments.join(", ")}`);
  }

  return {
    requireSupabase: args.includes("--require-supabase"),
    strict: args.includes("--strict"),
    supabaseProject,
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

function validatePostgresUrl(
  key,
  value,
  appEnvironment,
  supabaseProject,
  requireSupabase,
  issues,
) {
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

  if (
    (appEnvironment !== "local" || requireSupabase) &&
    !matchesSupabaseProject(parsedUrl, supabaseProject)
  ) {
    issues.push({
      key,
      message: `${key} must target Supabase project ${supabaseProject}. Use db.${supabaseProject}.supabase.co or the matching Supabase pooler endpoint.`,
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

function validateAppBaseUrl(key, value, appEnvironment, issues) {
  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    issues.push({
      key,
      message: `${key} must be a valid URL.`,
    });
    return;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    issues.push({
      key,
      message: `${key} must start with http:// or https://.`,
    });
  }

  if (
    parsedUrl.pathname !== "/" ||
    parsedUrl.search.length > 0 ||
    parsedUrl.hash.length > 0
  ) {
    issues.push({
      key,
      message: `${key} must be an origin without a path, query string, or hash.`,
    });
  }

  if (
    appEnvironment === "production" &&
    parsedUrl.origin !== productionAppOrigin
  ) {
    issues.push({
      key,
      message: `${key} must be ${productionAppOrigin} in production.`,
    });
  }
}

function validateSupabaseProjectUrl(key, value, supabaseProject, issues) {
  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    issues.push({
      key,
      message: `${key} must be a valid Supabase project URL.`,
    });
    return;
  }

  const expectedUrl = `https://${supabaseProject}.supabase.co`;

  if (parsedUrl.toString().replace(/\/$/u, "") !== expectedUrl) {
    issues.push({
      key,
      message: `${key} must be ${expectedUrl}.`,
    });
  }
}

function validateSupabaseKey(
  key,
  value,
  allowedModernPrefixes,
  expectedDescription,
  issues,
) {
  if (readValue(value).length === 0) {
    return;
  }

  if (hasPlaceholderSecret(value)) {
    issues.push({
      key,
      message: `${key} must replace the placeholder Supabase key before use.`,
    });
    return;
  }

  if (!isJwtLikeValue(value) && !hasAllowedPrefix(value, allowedModernPrefixes)) {
    issues.push({
      key,
      message: `${key} must be ${expectedDescription}.`,
    });
  }
}

function validateClerkKey(key, value, allowedPrefixes, requiredPrefix, issues) {
  if (readValue(value).length === 0) {
    return;
  }

  if (hasPlaceholderSecret(value) || !hasAllowedPrefix(value, allowedPrefixes)) {
    issues.push({
      key,
      message: `${key} must be a valid Clerk API key.`,
    });
    return;
  }

  if (requiredPrefix && !value.startsWith(requiredPrefix)) {
    issues.push({
      key,
      message: `${key} must use a Clerk production key beginning with ${requiredPrefix}.`,
    });
  }
}

function validateOptionalPositiveInteger(key, value, issues) {
  if (readValue(value).length === 0) {
    return;
  }

  if (!/^\d+$/u.test(value) || Number(value) <= 0) {
    issues.push({
      key,
      message: `${key} must be a positive integer.`,
    });
  }
}

function hasPlaceholderSecret(value) {
  const normalizedValue = value.toLowerCase();

  return (
    normalizedValue.includes("replace_with") ||
    normalizedValue.includes("your-password") ||
    normalizedValue.includes("your_password")
  );
}

function isSupabasePostgresHost(hostname) {
  return (
    hostname.endsWith(".supabase.co") ||
    hostname.endsWith(supabasePoolerHostSuffix)
  );
}

function hasRequiredSslMode(parsedUrl) {
  return secureSslModes.has(parsedUrl.searchParams.get("sslmode") ?? "");
}

function matchesSupabaseProject(parsedUrl, projectRef) {
  const normalizedHostname = parsedUrl.hostname.toLowerCase();
  const normalizedProjectRef = projectRef.toLowerCase();

  if (normalizedHostname === `db.${normalizedProjectRef}.supabase.co`) {
    return true;
  }

  if (!normalizedHostname.endsWith(supabasePoolerHostSuffix)) {
    return false;
  }

  const decodedUsername = safeDecodeURIComponent(parsedUrl.username);

  if (!decodedUsername) {
    return false;
  }

  const normalizedUsername = decodedUsername.toLowerCase();

  return normalizedUsername === `postgres.${normalizedProjectRef}`;
}

function isJwtLikeValue(value) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(value);
}

function hasAllowedPrefix(value, allowedPrefixes) {
  return allowedPrefixes.some((prefix) => value.startsWith(prefix));
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
