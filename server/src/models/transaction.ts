import type { PoolClient } from "pg";

export const begin = (client: PoolClient) => client.query("BEGIN");
export const commit = (client: PoolClient) => client.query("COMMIT");
export const rollback = (client: PoolClient) => client.query("ROLLBACK");
