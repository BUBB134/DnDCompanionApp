import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;

const databaseEnvFiles = [".env", ".env.local", "apps/web/.env.local"];

loadEnvFiles();

let client;

try {
  const databaseUrl = resolveDatabaseUrl();
  client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();
  await client.query("select 1");
  console.log("Database connection check passed.");
} catch (error) {
  console.error(formatDatabaseError(error));
  process.exitCode = 1;
} finally {
  if (client) {
    await client.end();
  }
}

function loadEnvFiles() {
  for (const relativePath of databaseEnvFiles) {
    const absolutePath = join(process.cwd(), relativePath);

    if (!existsSync(absolutePath)) {
      continue;
    }

    const fileContents = readFileSync(absolutePath, "utf8");

    for (const [key, value] of parseEnvFile(fileContents)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function resolveDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();

  if (!value) {
    throw new Error(
      "DATABASE_URL is required. Copy .env.example to apps/web/.env.local or export DATABASE_URL before running db:check.",
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

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error("DATABASE_URL must start with postgres:// or postgresql://.");
  }

  return value;
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

function formatDatabaseError(error) {
  if (error instanceof Error) {
    if (error.message.includes("connect") || error.message.includes("ECONNREFUSED")) {
      return `Unable to connect to Postgres. ${error.message}`;
    }

    return error.message;
  }

  return "An unknown database error occurred.";
}
