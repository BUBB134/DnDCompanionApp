import pg from "pg";
import {
  describeDatabaseTarget,
  formatDatabaseError,
  loadEnvFiles,
  parseDatabaseOptions,
  resolveDatabaseClientConfig,
} from "./database-env.mjs";

const { Client } = pg;

loadEnvFiles();

let client;

try {
  const connectionConfig = resolveDatabaseClientConfig(
    parseDatabaseOptions(process.argv.slice(2)),
  );

  console.log(
    `Checking database connection for ${describeDatabaseTarget(connectionConfig.connectionString)}.`,
  );

  client = new Client(connectionConfig);

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
