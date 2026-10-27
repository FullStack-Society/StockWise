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
  minimum_stock: number;
  price: number | string;
  units_issued: number;
  previous_units_issued: number;
};

export type MonthlyMovement = {
  month: string;
  units_received: number;
  units_issued: number;
};

export type InventoryReportData = {
  days: number;
  period_start: string;
  product_count: number;
  stock_units: number;
  inventory_value: number | string;
  low_stock_count: number;
  out_of_stock_count: number;
  units_received: number;
  units_issued: number;
  transaction_count: number;
  previous_units_received: number;
  previous_units_issued: number;
  previous_transaction_count: number;
  products: ReportProduct[];
  monthly_movement: MonthlyMovement[];
};

export function getInventoryReport(days: ReportPeriod) {
  return apiRequest<InventoryReportData>(ENDPOINTS.reports.inventory, {
    query: { days },
  });
}
