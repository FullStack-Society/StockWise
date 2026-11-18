import type { Pool, PoolClient, QueryResultRow } from "pg";

type QueryExecutor = Pick<Pool, "query"> | PoolClient;

export function runDatabaseQueryQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>("SELECT 1", values);
}
