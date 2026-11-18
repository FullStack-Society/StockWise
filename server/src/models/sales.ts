import type { Pool, PoolClient, QueryResultRow } from "pg";

type QueryExecutor = Pick<Pool, "query"> | PoolClient;

export function runGetMerchantQrQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT public.stockwise_get_merchant_qr($1) AS merchant_qr_data`,
    values,
  );
}

export function runSetMerchantQrQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "CALL public.stockwise_set_merchant_qr($1, $2, $3)",
    values,
  );
}

export function runRecordSaleQuery<T extends QueryResultRow = QueryResultRow>(
  executor: QueryExecutor,
  values: any[] = [],
) {
  return executor.query<T>(
    "CALL public.stockwise_record_sale($1, $2, $3::uuid, $4, $5::jsonb, NULL)",
    values,
  );
}
