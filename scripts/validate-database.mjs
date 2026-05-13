import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const requiredFiles = [
  "packages/db/migrations/0001_baseline.sql",
  "packages/db/package.json",
  "packages/db/src/env.ts",
  "packages/db/src/errors.ts",
  "packages/db/src/index.ts",
  "packages/db/src/schema.ts",
  "scripts/apply-migrations.mjs",
  "scripts/check-database.mjs",
  "scripts/create-migration.mjs",
  "scripts/database-env.mjs",
  "docs/engineering/supabase-postgres.md",
];

for (const file of requiredFiles) {
  expect(existsSync(resolve(file)), `Missing database file: ${file}`);
}

const rootPackage = readJson("package.json");
for (const script of ["db:check", "db:generate", "db:migrate"]) {
  expect(
    typeof rootPackage.scripts?.[script] === "string",
    `Missing database script: ${script}`,
  );
}
for (const script of ["db:check:supabase", "db:migrate:supabase"]) {
  expect(
    rootPackage.scripts?.[script]?.includes("--supabase-project=egrmvhfroiumcodkotjv"),
    `Missing Supabase database script: ${script}`,
  );
}

expect(
  typeof rootPackage.devDependencies?.pg === "string",
  "Missing pg dev dependency.",
);

const dbPackage = readJson("packages/db/package.json");
for (const dependency of ["@dnd/env", "@dnd/types"]) {
  expect(
    typeof dbPackage.dependencies?.[dependency] === "string",
    `Missing @dnd/db dependency: ${dependency}`,
  );
}

const schemaText = readText("packages/db/src/schema.ts");
for (const tableName of [
  '"users"',
  '"campaigns"',
  '"campaign_memberships"',
  '"campaign_invites"',
  '"campaign_invite_acceptances"',
  '"sessions"',
  '"characters"',
  '"entities"',
  '"session_entity_tags"',
  '"notes"',
  '"rule_snippets"',
  '"ability_summaries"',
]) {
  expect(
    schemaText.includes(tableName),
    `Baseline schema is missing table definition for ${tableName}.`,
  );
}

const envText = readText("packages/db/src/env.ts");
expect(
  envText.includes("apps/web/.env.local"),
  "Database env loader must read apps/web/.env.local.",
);
expect(
  envText.includes("DATABASE_URL is required"),
  "Database env loader must surface a clear DATABASE_URL error.",
);
for (const snippet of [
  "resolveDatabaseConnectionConfig",
  "DATABASE_POOL_MAX",
  "DATABASE_CONNECTION_TIMEOUT_MS",
  "DATABASE_IDLE_TIMEOUT_MS",
  "sslmode",
  "must replace the placeholder database password",
]) {
  expect(envText.includes(snippet), `Database env loader is missing Supabase support: ${snippet}`);
}

const checkScriptText = readText("scripts/check-database.mjs");
expect(
  checkScriptText.includes("select 1"),
  "Database check script must verify a live connection.",
);
expect(
  checkScriptText.includes("parseDatabaseOptions"),
  "Database check script must support Supabase validation options.",
);

const applyMigrationsText = readText("scripts/apply-migrations.mjs");
expect(
  applyMigrationsText.includes("schema_migrations"),
  "Migration runner must track applied migrations.",
);
expect(
  applyMigrationsText.includes("begin"),
  "Migration runner must apply migrations transactionally.",
);
expect(
  applyMigrationsText.includes("parseDatabaseOptions"),
  "Migration runner must support Supabase validation options.",
);

const databaseEnvScript = readText("scripts/database-env.mjs");
for (const snippet of [
  "supabaseProjectRef",
  "egrmvhfroiumcodkotjv",
  "supabasePoolerHostSuffix",
  "normalizedHostname === `db.${normalizedProjectRef}.supabase.co`",
  "normalizedUsername === `postgres.${normalizedProjectRef}`",
  "sslmode=require",
  "REDACTED",
]) {
  expect(
    databaseEnvScript.includes(snippet),
    `Database script env helper is missing Supabase support: ${snippet}`,
  );
}

const supabaseDocs = readText("docs/engineering/supabase-postgres.md");
for (const snippet of [
  "db.egrmvhfroiumcodkotjv.supabase.co",
  "`npm run db:check:supabase`",
  "`npm run db:migrate:supabase`",
  "npx skills add supabase/agent-skills",
]) {
  expect(
    supabaseDocs.includes(snippet),
    `Supabase docs are missing expected content: ${snippet}`,
  );
}

const migrationDirectory = resolve("packages/db/migrations");
const sqlFiles = readdirSync(migrationDirectory).filter((file) => file.endsWith(".sql"));
expect(sqlFiles.length > 0, "Missing SQL migration files.");

if (failures.length > 0) {
  console.error("Database validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Database validation passed.");

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function readText(path) {
  return readFileSync(resolve(path), "utf8");
}

function resolve(path) {
  return join(rootDir, path);
}
