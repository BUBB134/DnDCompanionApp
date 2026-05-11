import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const supabaseProjectRef = "egrmvhfroiumcodkotjv";
export const supabaseDirectHost = `db.${supabaseProjectRef}.supabase.co`;
export const databaseEnvFiles = [".env", ".env.local", "apps/web/.env.local"];

const databaseProtocols = new Set(["postgres:", "postgresql:"]);
const secureSslModes = new Set(["require", "verify-ca", "verify-full"]);
const supabasePoolerHostSuffix = ".pooler.supabase.com";
const defaultConnectionTimeoutMillis = 10_000;

export function loadEnvFiles(target = process.env) {
  for (const relativePath of databaseEnvFiles) {
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

export function parseDatabaseOptions(args) {
  return {
    requireSsl: args.includes("--require-ssl"),
    supabaseProject: readOption(args, "--supabase-project"),
  };
}

export function resolveDatabaseClientConfig(options = {}) {
  const databaseUrl = resolveDatabaseUrl(process.env, options);
  const parsedUrl = new URL(databaseUrl);

  return {
    application_name: process.env.DATABASE_APPLICATION_NAME ?? "dnd-companion-script",
    connectionString: databaseUrl,
    connectionTimeoutMillis: readPositiveInteger(
      process.env.DATABASE_CONNECTION_TIMEOUT_MS,
      defaultConnectionTimeoutMillis,
      "DATABASE_CONNECTION_TIMEOUT_MS",
    ),
    ssl: resolveSslConfig(parsedUrl, options),
  };
}

export function describeDatabaseTarget(connectionString) {
  const parsedUrl = new URL(connectionString);

  parsedUrl.password = parsedUrl.password ? "REDACTED" : "";

  if (parsedUrl.search.length > 0) {
    parsedUrl.search = "?...";
  }

  return parsedUrl.toString();
}

export function formatDatabaseError(error) {
  if (error instanceof Error) {
    if (error.message.includes("connect") || error.message.includes("ECONNREFUSED")) {
      return `Unable to connect to Postgres. ${error.message}`;
    }

    return error.message;
  }

  return "An unknown database error occurred.";
}

function resolveDatabaseUrl(source, options) {
  const value = source.DATABASE_URL?.trim();

  if (!value) {
    throw new Error(
      "DATABASE_URL is required. Copy .env.example to apps/web/.env.local or export DATABASE_URL before running database commands.",
    );
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch (error) {
    throw new Error(
      `DATABASE_URL must be a valid Postgres connection string. ${error instanceof Error ? error.message : ""}`.trim(),
    );
  }

  if (!databaseProtocols.has(parsedUrl.protocol)) {
    throw new Error("DATABASE_URL must start with postgres:// or postgresql://.");
  }

  if (hasPlaceholderSecret(parsedUrl.password)) {
    throw new Error("DATABASE_URL must replace the placeholder database password before use.");
  }

  if (options.requireSsl && !hasSecureSslMode(parsedUrl)) {
    throw new Error(
      "DATABASE_URL must include sslmode=require, sslmode=verify-ca, or sslmode=verify-full.",
    );
  }

  if (options.supabaseProject && !matchesSupabaseProject(parsedUrl, options.supabaseProject)) {
    throw new Error(
      `DATABASE_URL must target Supabase project ${options.supabaseProject}. Use ${supabaseDirectHost} or the matching Supabase pooler endpoint.`,
    );
  }

  return value;
}

function resolveSslConfig(parsedUrl, options) {
  const sslMode = parsedUrl.searchParams.get("sslmode");

  if (sslMode === "disable") {
    return undefined;
  }

  if (sslMode === "verify-ca" || sslMode === "verify-full") {
    return { rejectUnauthorized: true };
  }

  if (sslMode === "require" || options.requireSsl || isSupabasePostgresHost(parsedUrl.hostname)) {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

function matchesSupabaseProject(parsedUrl, projectRef) {
  const normalizedHostname = parsedUrl.hostname.toLowerCase();
  const normalizedProjectRef = projectRef.toLowerCase();
  const normalizedUsername = decodeURIComponent(parsedUrl.username).toLowerCase();

  if (normalizedHostname === `db.${normalizedProjectRef}.supabase.co`) {
    return true;
  }

  if (!normalizedHostname.endsWith(supabasePoolerHostSuffix)) {
    return false;
  }

  return normalizedUsername === `postgres.${normalizedProjectRef}`;
}

function isSupabasePostgresHost(hostname) {
  return hostname.endsWith(".supabase.co") || hostname.endsWith(supabasePoolerHostSuffix);
}

function hasSecureSslMode(parsedUrl) {
  return secureSslModes.has(parsedUrl.searchParams.get("sslmode"));
}

function hasPlaceholderSecret(value) {
  const normalizedValue = value.toLowerCase();

  return (
    normalizedValue.includes("replace_with") ||
    normalizedValue.includes("your-password") ||
    normalizedValue.includes("your_password")
  );
}

function readPositiveInteger(value, fallback, key) {
  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }

  if (!/^\d+$/u.test(value) || Number(value) <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return Number(value);
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
