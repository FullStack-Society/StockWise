import type { QueryResultRow } from "pg";

export interface PurchaseOrderRow extends QueryResultRow {
  order_id: number | string;
  order_number: number | string;
  notes: string | null;
  created_by_email: string;
  created_at: Date | string;
  status: string;
  item_id: number | string;
  product_id: number | string;
  product_name: string;
  sku: string;
  quantity_ordered: number | string;
  quantity_received: number | string;
  unit_price: number | string;
}

export interface PurchaseOrderHistoryRow extends QueryResultRow {
  event_id: number | string;
  order_id: number | string;
  order_number: number | string;
}

export type PurchaseOrderItem = {
  item_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity_ordered: number;
  unit_price: number;
  quantity_received: number;
  quantity_remaining: number;
};

export type PurchaseOrder = {
  order_id: number;
  order_number: number;
  notes: string | null;
  created_by_email: string;
  created_at: Date | string;
  status: string;
  items: PurchaseOrderItem[];
};
