import type { QueryResultRow } from "pg";

export type ReportObject = Record<string, unknown>;

export interface SalesReportTotalsRow extends QueryResultRow {
  sales_count: number;
  units_sold: number;
  previous_sales_count: number;
}

export interface UsageAnalyticsRow extends QueryResultRow {
  page: string;
  views: number | string;
}

export interface DailyStockMovementRow extends QueryResultRow {
  day: string;
  units_received: number | string;
  units_issued: number | string;
  received_value: string;
}

export interface YearlyStockMovementRow extends QueryResultRow {
  year: number | string;
  units_received: number | string;
  units_issued: number | string;
  received_value: string;
}
