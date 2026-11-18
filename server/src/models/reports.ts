import type { Pool, PoolClient, QueryResultRow } from "pg";

type QueryExecutor = Pick<Pool, "query"> | PoolClient;

export function runGetUserTimezoneQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_get_user_timezone($1) AS timezone",
    values,
  );
}

export function runGetInventoryReportQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT public.stockwise_get_inventory_report($1, $2, $3) AS report`,
    values,
  );
}

export function runGetSalesReportTotalsQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT * FROM public.stockwise_get_sales_report_totals($1, $2, $3)`,
    values,
  );
}

export function runGetSalesRevenueTotalsQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT * FROM public.stockwise_get_sales_revenue_totals($1, $2, $3)`,
    values,
  );
}

export function runGetDailyInventoryMovementQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT to_char(movement.day, 'YYYY-MM-DD') AS day,
            movement.units_received,
            movement.units_issued,
            movement.received_value
     FROM public.stockwise_get_daily_inventory_movement($1, $2, $3, $4) AS movement`,
    values,
  );
}

export function runGetYearlyInventoryMovementQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT * FROM public.stockwise_get_yearly_inventory_movement($1, $2, $3)`,
    values,
  );
}

export function runGetMonthlyInventoryMovementTotalsQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    `SELECT * FROM public.stockwise_get_monthly_inventory_movement_totals($1, $2)`,
    values,
  );
}

export function runGetReorderSummaryQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_get_reorder_summary($1) AS summary",
    values,
  );
}

export function runRecordUsagePageViewQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "CALL public.stockwise_record_usage_page_view($1, $2, $3)",
    values,
  );
}

export function runGetUsageAnalyticsQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT * FROM public.stockwise_get_usage_analytics($1, $2)",
    values,
  );
}

export function runGetDashboardStockFlowQuery<
  T extends QueryResultRow = QueryResultRow,
>(executor: QueryExecutor, values: any[] = []) {
  return executor.query<T>(
    "SELECT public.stockwise_get_dashboard_stock_flow($1, $2, $3) AS report",
    values,
  );
}
