import pg from "pg";
import type { QueryResult, QueryResultRow } from "pg";
import { toDatabaseConnectionError } from "./errors";
import { resolveDatabaseUrl } from "./env";

const globalForDatabase = globalThis as typeof globalThis & {
  __dndDatabasePool?: pg.Pool;
};

export type DatabaseQueryable = {
  query<TRow extends QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<TRow>>;
};

export function getDatabasePool() {
  if (!globalForDatabase.__dndDatabasePool) {
    globalForDatabase.__dndDatabasePool = new pg.Pool({
      connectionString: resolveDatabaseUrl(),
    });
  }

  return globalForDatabase.__dndDatabasePool;
}

export async function queryDatabase<TRow extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
) {
  try {
    return await getDatabasePool().query<TRow>(text, [...values]);
  } catch (error) {
    throw toDatabaseConnectionError(error);
  }
}

export async function withDatabaseTransaction<TResult>(
  callback: (client: DatabaseQueryable) => Promise<TResult>,
) {
  const client = await getDatabasePool().connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Ignore rollback failures and surface the original database error instead.
    }

    throw toDatabaseConnectionError(error);
  } finally {
    client.release();
  }
}

export type DatabaseQueryResult<TRow extends QueryResultRow> = QueryResult<TRow>;
