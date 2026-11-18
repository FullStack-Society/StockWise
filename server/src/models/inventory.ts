import type { Pool, PoolClient, QueryResultRow } from "pg";

type QueryExecutor = Pick<Pool, "query"> | PoolClient;

export function runGetInventoryProductDetailsQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT *
       FROM public.stockwise_get_inventory_product_details($1, $2::integer[])`,
    values,
  );
}

export function runGetInventoryProductDetailsQuery2<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT *
       FROM public.stockwise_get_inventory_product_details($1, $2::integer[])`,
    values,
  );
}

export function runGetInventoryHistoryQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT *
           FROM public.stockwise_get_inventory_history($1, $2, $3)`,
    values,
  );
}

export function runOrganizationGetInventoryQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT *
           FROM public.organization_get_inventory($1, $2, $3, $4)`,
    values,
  );
}

export function runOrganizationGetInventoryQuery2<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT *
             FROM public.organization_get_inventory($1, NULL, NULL, $2)`,
    values,
  );
}

export function runOrganizationGetCategoriesQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT * FROM public.organization_get_categories($1)`,
    values,
  );
}

export function runCreateInventoryCategoryQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `CALL public.stockwise_create_inventory_category(
           $1, $2, NULL, NULL, NULL
         )`,
    values,
  );
}

export function runDeleteInventoryCategoryQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `CALL public.stockwise_delete_inventory_category($1, $2, NULL)`,
    values,
  );
}

export function runOrganizationGetInventoryByIdQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT *
           FROM public.organization_get_inventory_by_id($1, $2)`,
    values,
  );
}

export function runCreateInventoryQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `CALL public.stockwise_create_inventory(
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL
           )`,
    values,
  );
}

export function runOrganizationGetInventoryByIdQuery2<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT *
             FROM public.organization_get_inventory_by_id($1, $2)`,
    values,
  );
}

export function runUpdateInventoryQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `CALL public.stockwise_update_inventory(
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
           )`,
    values,
  );
}

export function runOrganizationGetInventoryByIdQuery3<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT *
             FROM public.organization_get_inventory_by_id($1, $2)`,
    values,
  );
}

export function runDeleteInventoryQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `CALL public.stockwise_delete_inventory($1, $2, NULL)`,
    values,
  );
}

export function runAdjustInventoryStockWriteQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `CALL public.stockwise_adjust_inventory_stock_write(
           $1, $2, $3, $4, $5, $6, NULL
         )`,
    values,
  );
}

export function runRecordStocktakeWriteQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `CALL public.stockwise_record_stocktake_write(
           $1, $2, $3, $4, $5, NULL
         )`,
    values,
  );
}
