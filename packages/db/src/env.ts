import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readServerEnv, type EnvSource } from "@dnd/env";
import { DatabaseConfigurationError } from "./errors";

const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, "../../..");
const validDatabaseProtocols = new Set(["postgres:", "postgresql:"]);

export const databaseEnvFiles = [".env", ".env.local", "apps/web/.env.local"] as const;

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

  return databaseUrl;
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
