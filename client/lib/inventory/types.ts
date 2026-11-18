import type { LucideIcon } from "lucide-react";

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export type InventoryStat = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export type Product = {
  id: number;
  name: string;
  sku: string;
  upc: string | null;
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  price: number;
  variant: string | null;
  quantity: number;
  reorderPoint: number;
  status: StockStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type Category = { id: number; name: string };

export type ProductInput = {
  name: string;
  sku: string;
  upc: string | null;
  categoryId: number | null;
  description: string | null;
  price: number;
  variant: string | null;
  quantity: number;
  reorderPoint: number;
};

export type InventoryImportRow = { row: number; product: ProductInput };

export type InventoryMovement = {
  id: number;
  occurredAt: string;
  type:
    | "IN"
    | "OUT"
    | "STOCKTAKE"
    | "OTHER";
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  expectedQuantity: number | null;
  countedQuantity: number | null;
  actorEmail: string;
  remarks: string | null;
};
