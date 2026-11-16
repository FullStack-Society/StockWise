import type { QueryResultRow } from "pg";

export interface InventoryRow extends QueryResultRow {
  product_id: number | string;
  product_name: string;
  sku: string;
  upc?: string | null;
  category_id: number | string | null;
  description?: string | null;
  price: number | string;
  quantity: number | string;
  reorder_point: number | string;
}

export interface InventoryMovementRow extends QueryResultRow {
  transaction_id: number | string;
  product_id: number | string;
  transaction_type: string;
  quantity: number | string;
  remarks: string | null;
  created_at: Date | string;
}

export interface InventoryCategoryRow extends QueryResultRow {
  category_id: number | string;
  category_name: string;
}

export type InventoryRecord = Record<string, unknown>;
