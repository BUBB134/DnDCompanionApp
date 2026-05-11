import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import {
  describeDatabaseTarget,
  formatDatabaseError,
  loadEnvFiles,
  parseDatabaseOptions,
  resolveDatabaseClientConfig,
} from "./database-env.mjs";

const { Client } = pg;
const migrationsDir = join(process.cwd(), "packages", "db", "migrations");

loadEnvFiles();

if (!existsSync(migrationsDir)) {
  console.error("Migration directory not found: packages/db/migrations");
  process.exit(1);
}

let client;

try {
  const connectionConfig = resolveDatabaseClientConfig(
    parseDatabaseOptions(process.argv.slice(2)),
  );

  console.log(
    `Applying database migrations for ${describeDatabaseTarget(connectionConfig.connectionString)}.`,
  );

  client = new Client(connectionConfig);

  await client.connect();
  await client.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const appliedMigrationsResult = await client.query("select id from schema_migrations");
  const appliedMigrationIds = new Set(appliedMigrationsResult.rows.map((row) => row.id));
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const migrationFile of migrationFiles) {
    if (appliedMigrationIds.has(migrationFile)) {
      continue;
    }

    const migrationSql = readFileSync(join(migrationsDir, migrationFile), "utf8").trim();

    if (migrationSql.length === 0) {
      console.warn(`Skipping empty migration: ${migrationFile}`);
      continue;
    }

    await client.query("begin");

    try {
      await client.query(migrationSql);
      await client.query("insert into schema_migrations (id) values ($1)", [migrationFile]);
      await client.query("commit");
      console.log(`Applied migration: ${migrationFile}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  console.log("Database migrations are up to date.");
} catch (error) {
  console.error(formatDatabaseError(error));
  process.exitCode = 1;
} finally {
  if (client) {
    await client.end();
  }
}
