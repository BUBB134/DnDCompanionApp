import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const migrationName = process.argv.slice(2).join(" ").trim();

if (!migrationName) {
  console.error("Provide a migration name, for example: npm run db:generate -- add-campaign-owner");
  process.exit(1);
}

const migrationsDir = join(process.cwd(), "packages", "db", "migrations");
const migrationFileName = `${createTimestamp()}_${slugify(migrationName)}.sql`;
const migrationFilePath = join(migrationsDir, migrationFileName);

if (!existsSync(migrationsDir)) {
  mkdirSync(migrationsDir, { recursive: true });
}

writeFileSync(
  migrationFilePath,
  `-- ${migrationName}\n-- Add SQL statements below. The migration runner applies files in filename order.\n\n`,
  "utf8",
);

console.log(`Created migration: packages/db/migrations/${migrationFileName}`);

function createTimestamp() {
  const now = new Date();

  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join("");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}
