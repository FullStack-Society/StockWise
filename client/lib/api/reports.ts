import "server-only";
import { apiRequest } from "./client";
import { ENDPOINTS } from "./endpoints";

export type ReportPeriod = 30 | 90 | 365;

export type ReportProduct = {
  id: number;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: number | string;
  units_issued: number;
  previous_units_issued: number;
};

export type MonthlyMovement = {
  month: string;
  units_received: number;
  units_issued: number;
};

export type DailyMovement = {
  day: string;
  units_received: number;
  units_issued: number;
  received_value: number | string;
};

export type YearlyMovement = {
  year: number;
  units_received: number;
  units_issued: number;
  received_value: number | string;
};

export type DailyStockFlow = {
  day: string;
  units_received: number;
};

export type DashboardStockReceipt = {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  received_at: string;
};

export type DashboardRecentProduct = {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  received_at: string;
};

export type DashboardStockFlow = {
  days: DailyStockFlow[];
  recent_receipts: DashboardStockReceipt[];
  recent_products: DashboardRecentProduct[];
};

export type InventoryReportData = {
  days: number;
  period_start: string;
  product_count: number;
  stock_units: number;
  inventory_value: number | string;
  stock_cost_value: number | string;
  low_stock_count: number;
  critical_count: number;
  units_received: number;
  units_issued: number;
  transaction_count: number;
  previous_units_received: number;
  previous_units_issued: number;
  previous_transaction_count: number;
  monthly_transaction_count: number;
  monthly_units_received: number;
  monthly_units_issued: number;
  products: ReportProduct[];
  monthly_movement: MonthlyMovement[];
  daily_movement: DailyMovement[];
  yearly_movement: YearlyMovement[];
};

export type UsageAnalyticsPage =
  | "dashboard"
  | "inventory"
  | "orders"
  | "reports"
  | "settings"
  | "users";

export type UsageAnalyticsSummary = {
  days: number;
  total_views: number;
  by_page: Array<{ page: UsageAnalyticsPage; views: number }>;
};

export function getUsageAnalyticsSummary(days = 30) {
  return apiRequest<UsageAnalyticsSummary>(ENDPOINTS.reports.usageAnalytics, {
    query: { days },
  });
}

export function recordUsagePageView(page: UsageAnalyticsPage) {
  return apiRequest<void>(ENDPOINTS.reports.usagePageView, {
    method: "POST",
    body: { page },
  });
}

export function getInventoryReport(days: ReportPeriod, offset = 0) {
  return apiRequest<InventoryReportData>(ENDPOINTS.reports.inventory, {
    query: { days, offset },
  });
}

export function getDashboardStockFlow(days: 7 | 14 | 30 = 7) {
  return apiRequest<DashboardStockFlow>(ENDPOINTS.reports.dashboardStockFlow, {
    query: { days },
  });
}
