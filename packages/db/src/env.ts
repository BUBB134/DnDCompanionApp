import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readServerEnv, type EnvSource } from "@dnd/env";
import { DatabaseConfigurationError } from "./errors";

const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, "../../..");
const validDatabaseProtocols = new Set(["postgres:", "postgresql:"]);
const defaultSupabasePoolMax = 5;
const defaultConnectionTimeoutMillis = 10_000;
const defaultIdleTimeoutMillis = 30_000;

export const databaseEnvFiles = [".env", ".env.local", "apps/web/.env.local"] as const;

export type DatabaseConnectionConfig = {
  application_name: string;
  connectionString: string;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  max: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
};

export function loadDatabaseEnv(target: EnvSource = process.env) {
  for (const relativePath of databaseEnvFiles) {
    const filePath = resolve(repoRoot, relativePath);

    if (!existsSync(filePath)) {
      continue;
    }

    const fileContents = readFileSync(filePath, "utf8");

    for (const [key, value] of parseEnvFile(fileContents)) {
      if (target[key] === undefined) {
        target[key] = value;
      }
    }
  }

  return target;
}

export function resolveDatabaseUrl(source: EnvSource = process.env) {
  if (source === process.env) {
    loadDatabaseEnv(process.env);
  }

  const { DATABASE_URL: databaseUrl } = readServerEnv(source);

  if (!databaseUrl) {
    throw new DatabaseConfigurationError(
      "DATABASE_URL is required for database commands. Copy .env.example to apps/web/.env.local or export DATABASE_URL before running migrations.",
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch (error) {
    throw new DatabaseConfigurationError(
      "DATABASE_URL must be a valid Postgres connection string.",
      error instanceof Error ? { cause: error } : undefined,
    );
  }

  if (!validDatabaseProtocols.has(parsedUrl.protocol)) {
    throw new DatabaseConfigurationError(
      "DATABASE_URL must start with postgres:// or postgresql://.",
    );
  }

  if (hasPlaceholderSecret(parsedUrl.password)) {
    throw new DatabaseConfigurationError(
      "DATABASE_URL must replace the placeholder database password before use.",
    );
  }

  if (isSupabasePostgresHost(parsedUrl.hostname) && !hasRequiredSslMode(parsedUrl)) {
    throw new DatabaseConfigurationError(
      "DATABASE_URL for Supabase must include sslmode=require, sslmode=verify-ca, or sslmode=verify-full.",
    );
  }

  return databaseUrl;
}

export function resolveDatabaseConnectionConfig(source: EnvSource = process.env) {
  if (source === process.env) {
    loadDatabaseEnv(process.env);
  }

  const databaseUrl = resolveDatabaseUrl(source);
  const parsedUrl = new URL(databaseUrl);

  return {
    application_name: source.DATABASE_APPLICATION_NAME ?? "dnd-companion",
    connectionString: databaseUrl,
    connectionTimeoutMillis: readPositiveInteger(
      source.DATABASE_CONNECTION_TIMEOUT_MS,
      defaultConnectionTimeoutMillis,
      "DATABASE_CONNECTION_TIMEOUT_MS",
    ),
    idleTimeoutMillis: readPositiveInteger(
      source.DATABASE_IDLE_TIMEOUT_MS,
      defaultIdleTimeoutMillis,
      "DATABASE_IDLE_TIMEOUT_MS",
    ),
    max: readPositiveInteger(
      source.DATABASE_POOL_MAX,
      isSupabasePostgresHost(parsedUrl.hostname) ? defaultSupabasePoolMax : 10,
      "DATABASE_POOL_MAX",
    ),
    ssl: resolveSslConfig(parsedUrl),
  } satisfies DatabaseConnectionConfig;
}

function parseEnvFile(fileContents: string) {
  const entries: Array<[string, string]> = [];

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

function stripOptionalQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
  key: string,
) {
  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }

  if (!/^\d+$/u.test(value) || Number(value) <= 0) {
    throw new DatabaseConfigurationError(`${key} must be a positive integer.`);
  }

  return Number(value);
}

function resolveSslConfig(parsedUrl: URL) {
  const sslMode = parsedUrl.searchParams.get("sslmode");

  if (sslMode === "disable") {
    return undefined;
  }

  if (sslMode === "verify-ca" || sslMode === "verify-full") {
    return { rejectUnauthorized: true };
  }

  if (sslMode === "require" || isSupabasePostgresHost(parsedUrl.hostname)) {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

function isSupabasePostgresHost(hostname: string) {
  return (
    hostname.endsWith(".supabase.co") ||
    hostname.endsWith(".pooler.supabase.com")
  );
}

function hasPlaceholderSecret(value: string) {
  const normalizedValue = value.toLowerCase();

  return (
    normalizedValue.includes("replace_with") ||
    normalizedValue.includes("your-password") ||
    normalizedValue.includes("your_password")
  );
}

function hasRequiredSslMode(parsedUrl: URL) {
  const sslMode = parsedUrl.searchParams.get("sslmode");

  return sslMode === "require" || sslMode === "verify-ca" || sslMode === "verify-full";
}
