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
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  price: number;
  quantity: number;
  reorderPoint: number;
  locationId: number;
  locationName: string;
  status: StockStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type Category = { id: number; name: string };

export type ProductInput = {
  name: string;
  sku: string;
  categoryId: number | null;
  description: string | null;
  price: number;
  quantity: number;
  reorderPoint: number;
};

export type InventoryImportRow = { row: number; product: ProductInput };

export type InventoryLocation = {
  id: number;
  name: string;
  createdAt: string;
};

export type InventoryMovement = {
  id: number;
  occurredAt: string;
  type:
    | "IN"
    | "OUT"
    | "STOCKTAKE"
    | "TRANSFER_IN"
    | "TRANSFER_OUT"
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
