import type { Pool, PoolClient, QueryResultRow } from "pg";

type QueryExecutor = Pick<Pool, "query"> | PoolClient;

export function runGetPurchaseOrdersQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT *
       FROM public.stockwise_get_purchase_orders($1, $2, $3)`,
    values,
  );
}

export function runGetPurchaseOrderHistoryQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT *
           FROM public.stockwise_get_purchase_order_history($1, $2)`,
    values,
  );
}

export function runCreatePurchaseOrderWriteQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `CALL public.stockwise_create_purchase_order_write(
             $1, $2, $3, $4::jsonb, NULL
           )`,
    values,
  );
}

export function runUpdatePurchaseOrderWriteQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `CALL public.stockwise_update_purchase_order_write($1, $2, $3, $4, $5::jsonb)`,
    values,
  );
}

export function runDeletePurchaseOrderWriteQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `CALL public.stockwise_delete_purchase_order_write($1, $2, $3)`,
    values,
  );
}

export function runReceivePurchaseOrderItemWriteQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `CALL public.stockwise_receive_purchase_order_item_write($1, $2, $3, $4, $5)`,
    values,
  );
}
